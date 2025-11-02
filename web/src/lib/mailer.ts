// web/src/lib/mailer.ts
import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST ?? "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? "587");
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";
const SMTP_FROM =
  process.env.SMTP_FROM ?? (SMTP_USER ? SMTP_USER : "noreply@example.com");

/**
 * Gmail 587 のときは secure=false にして STARTTLS に寄せる。
 * 465 のときだけ secure=true (implicit TLS)。
 */
function decideSecure(host: string, port: number): boolean {
  if (host === "smtp.gmail.com" && port === 587) return false;
  if (port === 465) return true;
  return false;
}

export function makeTransport() {
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "[mailer] SMTP_USER / SMTP_PASS が設定されていません (env を確認してください)"
    );
  }

  const isGmail587 = SMTP_HOST === "smtp.gmail.com" && SMTP_PORT === 587;

  const transportOptions = {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: decideSecure(SMTP_HOST, SMTP_PORT),
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      // Vercel ↔ Gmail でよく出た SSL routines:... を避けるために最低限 TLS1.2 にする
      minVersion: "TLSv1.2",
      servername: SMTP_HOST,
    },
  } as any;

  // nodemailer の型にないけど、Gmail:587 のときだけ requireTLS を付ける
  if (isGmail587) {
    transportOptions.secure = false;
    transportOptions.tls = {
      ...(transportOptions.tls || {}),
      rejectUnauthorized: true,
    };
    (transportOptions as any).requireTLS = true;
  }

  const transporter = nodemailer.createTransport(transportOptions);

  console.log("[mailer] config", {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: transportOptions.secure,
    user: SMTP_USER,
    hasPass: true,
    from: SMTP_FROM,
    isGmail587,
  });

  return { transporter, from: SMTP_FROM };
}

async function safeVerify(transporter: any) {
  if (typeof transporter.verify === "function") {
    try {
      await transporter.verify();
    } catch (err) {
      console.warn("[mailer] verify failed but continue:", err);
    }
  } else {
    console.log("[mailer] verify() not available, skipping");
  }
}

export async function sendMail(
  to: string,
  subject: string,
  html: string,
  text?: string
) {
  const { transporter, from } = makeTransport();
  await safeVerify(transporter);

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text: text ?? html,
  });

  console.log("[mailer] sent", { to, messageId: info.messageId });
  return info;
}
