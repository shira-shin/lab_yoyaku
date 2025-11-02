import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST || "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT || 587);
const secure = process.env.SMTP_SECURE === "true" ? true : false;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM || process.env.SMTP_USER || "";

if (!user || !pass) {
  // ここでthrowはしない。API側で検出する。
  console.warn("[mailer] SMTP_USER or SMTP_PASS is missing");
}

export type MailerConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string | undefined;
  hasPass: boolean;
  from: string;
};

const mailerConfig: MailerConfig = {
  host,
  port,
  secure,
  user,
  hasPass: !!pass,
  from,
};

export function getTransport() {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  return { transporter, from, config: { host, port, secure, user, hasPass: !!pass } };
}

export function getMailerConfig(): MailerConfig {
  return mailerConfig;
}

export function isSmtpConfigured() {
  return Boolean(mailerConfig.user && mailerConfig.hasPass);
}

export async function sendAppMail(opts: { to: string; subject: string; text?: string; html?: string }) {
  const { transporter, from, config } = getTransport();

  // デプロイでなにが入ってるか見たいのでlogする（passは出さない）
  console.log("[mailer] using config", {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    hasPass: config.hasPass,
    from,
  });

  if (!config.user || !config.hasPass) {
    throw new Error("SMTP is not configured (missing user/pass)");
  }

  const info = await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });

  console.log("[mailer] sendMail result", info.messageId || info);
  return info;
}
