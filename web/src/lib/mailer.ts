import nodemailer from "nodemailer";

const provider = process.env.MAIL_PROVIDER ?? "none";

export function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM ?? "Lab Yoyaku <no-reply@example.com>";
  return { provider, host, port, user, pass, from };
}

export function isSmtpUsable() {
  const { provider, host, user, pass } = getSmtpConfig();
  if (provider !== "smtp") return false;
  if (!host || !user || !pass) return false;
  return true;
}

export async function sendPasswordResetMail(to: string, resetUrl: string) {
  const { host, port, user, pass, from } = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  await transporter.sendMail({
    from,
    to,
    subject: "パスワード再設定",
    text: `下記リンクからパスワードを再設定してください。\n${resetUrl}\nこのリンクは一定時間で無効になります。`,
    html: `<p>下記リンクからパスワードを再設定してください。</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>このリンクは一定時間で無効になります。</p>`,
  });
}
