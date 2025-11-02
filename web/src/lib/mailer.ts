import nodemailer, { type MailOptions, type Transporter } from "nodemailer";

export type SmtpConfig = {
  host: string | null;
  port: number | null;
  secure: boolean;
  user: string | null;
  pass: string | null;
  from: string | null;
};

export type MailSendResult =
  | { ok: true }
  | { ok: false; reason: "missing-config" | "send-error"; error?: unknown };

function parsePort(raw: string | undefined | null): number | null {
  if (!raw) return 465;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSecure(raw: string | undefined | null): boolean {
  if (!raw) return true;
  const normalized = raw.trim().toLowerCase();
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return true;
}

function readEnvConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const port = parsePort(process.env.SMTP_PORT);
  const secure = parseSecure(process.env.SMTP_SECURE);
  const user = process.env.SMTP_USER ?? null;
  const pass = process.env.SMTP_PASS ?? null;
  const from = process.env.MAIL_FROM ?? null;

  return { host, port, secure, user, pass, from };
}

function hasCredentials(cfg: SmtpConfig): cfg is Required<SmtpConfig> {
  return Boolean(cfg.host && cfg.port && cfg.user && cfg.pass && cfg.from);
}

let cachedTransporter: Transporter | null = null;
let cachedConfigSignature: string | null = null;

function configSignature(cfg: SmtpConfig) {
  return [cfg.host ?? "", cfg.port ?? "", cfg.secure ? "1" : "0", cfg.user ?? "", cfg.from ?? ""].join("|");
}

function ensureTransporter(cfg: SmtpConfig): Transporter | null {
  if (!hasCredentials(cfg)) {
    return null;
  }

  const signature = configSignature(cfg);
  if (cachedTransporter && cachedConfigSignature === signature) {
    return cachedTransporter;
  }

  try {
    cachedTransporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    cachedConfigSignature = signature;
    return cachedTransporter;
  } catch (error) {
    console.error("[mailer] failed to initialize transporter", error);
    cachedTransporter = null;
    cachedConfigSignature = null;
    return null;
  }
}

export function getSmtpConfig(): SmtpConfig {
  return readEnvConfig();
}

export function isSmtpConfigured() {
  return hasCredentials(getSmtpConfig());
}

export async function sendMail(
  options: Omit<MailOptions, "from"> & { from?: string },
): Promise<MailSendResult> {
  const cfg = getSmtpConfig();
  const transporter = ensureTransporter(cfg);
  if (!transporter) {
    return { ok: false, reason: "missing-config" } as const;
  }

  const payload: MailOptions = {
    ...options,
    from: options.from ?? cfg.from,
  };

  try {
    await transporter.sendMail(payload);
    return { ok: true } as const;
  } catch (error) {
    console.error("[mailer] send failed", error);
    return { ok: false, reason: "send-error", error } as const;
  }
}

export async function sendPasswordResetMail(to: string, resetUrl: string): Promise<MailSendResult> {
  return sendMail({
    to,
    subject: "パスワード再設定",
    text: `下記リンクからパスワードを再設定してください。\n${resetUrl}\nこのリンクは一定時間で無効になります。`,
    html: `<p>下記リンクからパスワードを再設定してください。</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>このリンクは一定時間で無効になります。</p>`,
  });
}

// Warm up transporter during module evaluation when possible.
const initialConfig = getSmtpConfig();
if (hasCredentials(initialConfig)) {
  ensureTransporter(initialConfig);
}

