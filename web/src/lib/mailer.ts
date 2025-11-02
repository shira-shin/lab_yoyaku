import nodemailer, { type Transporter } from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE_ENV = process.env.SMTP_SECURE;
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
  if (secureEnv === "true") return true;
  if (secureEnv === "false") return false;

  if (host === "smtp.gmail.com") {
    if (port === 465) return true;
    return false;
  }

  if (port === 465) return true;
  return false;
}

function buildMailerConfig(): MailerConfig {
  const secure = decideSecure(SMTP_HOST, SMTP_PORT, SMTP_SECURE_ENV);

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

  console.log("[mailer] config", config);

  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP_USER or SMTP_PASS is missing in environment");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
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
