import nodemailer, { type Transporter } from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = process.env.SMTP_SECURE; // "true" | "false" | undefined
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "";

type MailerConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string | undefined;
  hasPass: boolean;
  from: string;
};

function decideSecure(host: string, port: number, secureEnv?: string) {
  // env が明示してる場合は基本的に従う
  if (secureEnv === "true") return port === 465 ? true : false;
  if (secureEnv === "false") return false;

  // Gmail 587 は STARTTLS 前提なので false
  if (host === "smtp.gmail.com" && port === 587) return false;

  if (port === 465) return true;

  return false;
}

function buildMailerConfig(): MailerConfig {
  let secure = decideSecure(SMTP_HOST, SMTP_PORT, SMTP_SECURE);

  const isGmail587 = SMTP_HOST === "smtp.gmail.com" && SMTP_PORT === 587;

  if (isGmail587 && secure) {
    console.log(
      "[mailer] port=587 on Gmail, forcing secure=false for STARTTLS",
    );
    secure = false;
  }

  return {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure,
    user: SMTP_USER,
    hasPass: !!SMTP_PASS,
    from: SMTP_FROM,
  };
}

export function makeTransport() {
  const config = buildMailerConfig();

  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP_USER or SMTP_PASS is missing in environment");
  }

  const isGmail587 =
    config.host === "smtp.gmail.com" && Number(config.port) === 587;

  // nodemailer に渡す基本オプション
  const transportOptions: nodemailer.TransportOptions = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    // TLS自体のオプションはここに寄せる（これは型にある）
    tls: {
      minVersion: "TLSv1.2",
      servername: config.host,
    },
  };

  // ★ nodemailer の型にはないが Gmail 587 で強く STARTTLS を要求したい場合だけ後から付ける
  if (isGmail587) {
    (transportOptions as any).requireTLS = true;
  }

  const transporter = nodemailer.createTransport(transportOptions);

  console.log("[mailer] config", {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    hasPass: config.hasPass,
    from: config.from,
    gmail587: isGmail587,
  });

  return { transporter, from: config.from };
}

async function safeVerify(transporter: Transporter) {
  const maybeVerify = (transporter as any).verify;
  if (typeof maybeVerify === "function") {
    try {
      await maybeVerify.call(transporter);
    } catch (err) {
      console.warn("[mailer] verify failed but continue:", err);
    }
  } else {
    console.log("[mailer] verify() not available on this transporter; skipping");
  }
}

export async function sendMail(
  to: string,
  subject: string,
  html: string,
  text?: string,
) {
  const { transporter, from } = makeTransport();

  await safeVerify(transporter);

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text: text || html,
  });

  console.log("[mailer] sent", { messageId: info.messageId, to });
  return info;
}

export function getMailerConfig(): MailerConfig {
  return buildMailerConfig();
}

export function isSmtpConfigured() {
  return Boolean(SMTP_USER && SMTP_PASS);
}

export async function sendAppMail(opts: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) {
  return sendMail(opts.to, opts.subject, opts.html ?? opts.text ?? "", opts.text);
}
