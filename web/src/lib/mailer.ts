import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = process.env.SMTP_SECURE === "true" ? true : false;
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

const mailerConfig: MailerConfig = {
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  user: SMTP_USER,
  hasPass: !!SMTP_PASS,
  from: SMTP_FROM,
};

export function makeTransport() {
  console.log("[mailer] config", {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    user: SMTP_USER,
    hasPass: !!SMTP_PASS,
    from: SMTP_FROM,
  });

  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP_USER or SMTP_PASS is missing in environment");
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return { transporter, from: SMTP_FROM };
}

export async function sendMail(
  to: string,
  subject: string,
  html: string,
  text?: string,
) {
  const { transporter, from } = makeTransport();

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
  return mailerConfig;
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
