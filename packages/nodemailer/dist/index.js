"use strict";

const net = require("node:net");
const tls = require("node:tls");
const os = require("node:os");
const crypto = require("node:crypto");
const { once } = require("node:events");

class SmtpError extends Error {
  constructor(message, response) {
    super(message);
    this.name = "SmtpError";
    this.response = response;
  }
}

class SmtpClient {
  constructor(options) {
    this.options = options;
    this.socket = null;
    this.buffer = "";
    this.capabilities = [];
    this.closed = false;
  }

  async connect() {
    const { host, port = this.options.secure ? 465 : 587, secure = false, timeout = 15000 } = this.options;
    this.secure = secure || port === 465;
    const connectOpts = { host, port };
    let socket;
    if (this.secure) {
      socket = tls.connect({ ...connectOpts, servername: host, timeout });
      await once(socket, "secureConnect");
    } else {
      socket = net.createConnection(connectOpts);
      await once(socket, "connect");
    }
    socket.setEncoding("utf8");
    socket.setNoDelay(true);
    socket.setTimeout(timeout, () => {
      socket.destroy(new Error("SMTP connection timed out"));
    });
    socket.on("error", () => {
      if (!this.closed) {
        this.closed = true;
      }
    });
    this.socket = socket;
    this.buffer = "";
    const greeting = await this._readResponse();
    if (greeting.code !== 220) {
      throw new SmtpError("Unexpected SMTP greeting", greeting);
    }
  }

  async close() {
    if (this.socket && !this.socket.destroyed) {
      this.socket.end();
      this.socket.destroy();
    }
    this.closed = true;
  }

  async command(text) {
    if (!this.socket) throw new Error("SMTP connection not established");
    await new Promise((resolve, reject) => {
      this.socket.write(`${text}\r\n`, (err) => (err ? reject(err) : resolve()));
    });
    return this._readResponse();
  }

  async _readResponse() {
    const line = await this._readLine();
    const code = parseInt(line.slice(0, 3), 10);
    const lines = [line];
    let rest = line;
    while (rest.length >= 4 && rest[3] === "-") {
      rest = await this._readLine();
      lines.push(rest);
    }
    return { code, lines };
  }

  async _readLine() {
    while (true) {
      const idx = this.buffer.indexOf("\n");
      if (idx !== -1) {
        const line = this.buffer.slice(0, idx);
        this.buffer = this.buffer.slice(idx + 1);
        return line.replace(/\r$/, "");
      }
      const [chunk] = await once(this.socket, "data");
      if (typeof chunk === "string") {
        this.buffer += chunk;
      } else {
        this.buffer += chunk.toString("utf8");
      }
    }
  }

  async greet() {
    const hostname = this.options.clientHostname || os.hostname() || "localhost";
    const response = await this.command(`EHLO ${hostname}`);
    if (response.code !== 250) {
      throw new SmtpError("SMTP EHLO failed", response);
    }
    this.capabilities = response.lines.slice(1).map((line) => line.slice(4).trim().toUpperCase());
    return this.capabilities;
  }

  async maybeStartTls() {
    if (this.secure) return;
    if (!this.capabilities.some((cap) => cap.startsWith("STARTTLS"))) return;
    const res = await this.command("STARTTLS");
    if (res.code !== 220) {
      throw new SmtpError("STARTTLS command rejected", res);
    }
    await this._upgradeToTls();
    await this.greet();
  }

  async _upgradeToTls() {
    const { host, timeout = 15000 } = this.options;
    const tlsSocket = tls.connect({
      socket: this.socket,
      host,
      servername: host,
      timeout,
    });
    await once(tlsSocket, "secureConnect");
    tlsSocket.setEncoding("utf8");
    tlsSocket.setNoDelay(true);
    tlsSocket.setTimeout(timeout, () => {
      tlsSocket.destroy(new Error("SMTP TLS connection timed out"));
    });
    this.socket = tlsSocket;
    this.buffer = "";
  }

  async login() {
    const auth = this.options.auth;
    if (!auth || !auth.user || !auth.pass) return;
    const res = await this.command("AUTH LOGIN");
    if (res.code !== 334) throw new SmtpError("AUTH LOGIN rejected", res);
    const userRes = await this.command(Buffer.from(auth.user, "utf8").toString("base64"));
    if (userRes.code !== 334) throw new SmtpError("SMTP username rejected", userRes);
    const passRes = await this.command(Buffer.from(auth.pass, "utf8").toString("base64"));
    if (passRes.code !== 235) throw new SmtpError("SMTP password rejected", passRes);
  }

  async mailFrom(address) {
    const res = await this.command(`MAIL FROM:<${address}>`);
    if (res.code !== 250) throw new SmtpError("MAIL FROM rejected", res);
  }

  async rcptTo(address) {
    const res = await this.command(`RCPT TO:<${address}>`);
    if (res.code !== 250 && res.code !== 251) {
      throw new SmtpError("RCPT TO rejected", res);
    }
  }

  async data(message) {
    const res = await this.command("DATA");
    if (res.code !== 354) throw new SmtpError("DATA command rejected", res);
    await new Promise((resolve, reject) => {
      this.socket.write(message, (err) => (err ? reject(err) : resolve()));
    });
    const finalRes = await this._readResponse();
    if (finalRes.code !== 250) throw new SmtpError("Message not accepted", finalRes);
  }

  async quit() {
    try {
      const res = await this.command("QUIT");
      if (res.code !== 221) throw new SmtpError("QUIT command rejected", res);
    } catch (_) {
      // ignore
    } finally {
      await this.close();
    }
  }
}

function normalizeAddressList(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((entry) => {
      if (!entry) return "";
      if (typeof entry === "string") return entry;
      if (entry.address) return entry.address;
      return "";
    })
    .flatMap((entry) => String(entry).split(/[,;]+/))
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/<([^>]+)>/);
      return match ? match[1].trim() : entry;
    });
}

function formatAddressHeader(value, fallback) {
  if (!value) return fallback || "";
  if (Array.isArray(value)) {
    return value
      .map((entry) => formatAddressHeader(entry, ""))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && value.address) {
    return value.name ? `${value.name} <${value.address}>` : value.address;
  }
  return fallback || "";
}

function escapeDots(text) {
  return text
    .split(/\r?\n/)
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

function buildMessage(envelope, content) {
  const headers = [];
  headers.push(`From: ${content.from || envelope.from}`);
  if (content.to) headers.push(`To: ${content.to}`);
  if (content.cc) headers.push(`Cc: ${content.cc}`);
  if (content.subject) headers.push(`Subject: ${content.subject}`);
  const messageId = `<${crypto.randomUUID()}@${os.hostname() || "localhost"}>`;
  headers.push(`Message-ID: ${messageId}`);
  headers.push(`Date: ${new Date().toUTCString()}`);
  headers.push("MIME-Version: 1.0");
  let body = "";
  if (content.text && content.html) {
    const boundary = `lab-yoyaku-${crypto.randomUUID()}`;
    headers.push(`Content-Type: multipart/alternative; boundary=\"${boundary}\"`);
    body = [
      `--${boundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      content.text,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      content.html,
      "",
      `--${boundary}--`,
      "",
    ].join("\r\n");
  } else if (content.html) {
    headers.push("Content-Type: text/html; charset=utf-8");
    headers.push("Content-Transfer-Encoding: 8bit");
    body = content.html;
  } else {
    headers.push("Content-Type: text/plain; charset=utf-8");
    headers.push("Content-Transfer-Encoding: 8bit");
    body = content.text || "";
  }
  const normalizedBody = escapeDots((body || "").replace(/\r?\n/g, "\r\n"));
  const raw = `${headers.join("\r\n")}\r\n\r\n${normalizedBody}\r\n.\r\n`;
  return { raw, messageId };
}

class Transporter {
  constructor(options) {
    this.options = options;
  }

  async sendMail(mailOptions) {
    const client = new SmtpClient(this.options);
    const recipients = [
      ...normalizeAddressList(mailOptions.to),
      ...normalizeAddressList(mailOptions.cc),
      ...normalizeAddressList(mailOptions.bcc),
    ];
    if (!recipients.length) {
      throw new Error("No recipients provided");
    }
    const fromAddress = normalizeAddressList(mailOptions.from || this.options.from || (this.options.auth && this.options.auth.user))[0];
    if (!fromAddress) {
      throw new Error("No sender address available");
    }
    try {
      await client.connect();
      await client.greet();
      await client.maybeStartTls();
      await client.login();
      await client.mailFrom(fromAddress);
      for (const address of recipients) {
        await client.rcptTo(address);
      }
      const { raw, messageId } = buildMessage(
        { from: fromAddress, to: recipients },
        {
          from: formatAddressHeader(mailOptions.from, fromAddress),
          to: formatAddressHeader(mailOptions.to),
          cc: formatAddressHeader(mailOptions.cc),
          subject: mailOptions.subject,
          text: mailOptions.text,
          html: mailOptions.html,
        }
      );
      await client.data(raw);
      await client.quit();
      return {
        accepted: recipients,
        rejected: [],
        envelope: { from: fromAddress, to: recipients },
        messageId,
      };
    } catch (error) {
      await client.close();
      throw error;
    }
  }
}

function createTransport(options) {
  if (!options || !options.host) {
    throw new Error("SMTP transport requires a host");
  }
  return new Transporter(options);
}

const nodemailer = { createTransport };
nodemailer.createTransport = createTransport;
module.exports = nodemailer;
module.exports.default = nodemailer;
