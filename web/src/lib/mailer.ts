import nodemailer from "nodemailer";

const SMTP_HOST =
  process.env.SMTP_HOST || process.env.MAIL_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(
  process.env.SMTP_PORT || process.env.MAIL_PORT || 587
);
const SMTP_USER =
  process.env.SMTP_USER || process.env.MAIL_USER || process.env.EMAIL_USER;
const SMTP_PASS =
  process.env.SMTP_PASS || process.env.MAIL_PASS || process.env.EMAIL_PASS;

// Gmail:587 のときは必ず secure: false
const isGmail587 = SMTP_HOST === "smtp.gmail.com" && SMTP_PORT === 587;

export function getMailerConfig() {
  // debug API が直接見たいのでここで from を決めておく
  const from =
    process.env.MAIL_FROM || process.env.EMAIL_FROM || SMTP_USER || undefined;

  const auth =
    SMTP_USER && SMTP_PASS
      ? {
          user: SMTP_USER,
          pass: SMTP_PASS,
        }
      : undefined;

  return {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: isGmail587 ? false : SMTP_PORT === 465,
    auth,
    // ↓↓↓ ここが今回の“後方互換”フィールド ↓↓↓
    user: SMTP_USER,
    hasPass: Boolean(SMTP_PASS),
    from,
  };
}

export function isSmtpConfigured() {
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);
}

const transporter = nodemailer.createTransport(getMailerConfig());

// 後方互換あり sendMail
export async function sendMail(
  arg1:
    | {
        to: string;
        subject: string;
        text?: string;
        html?: string;
        from?: string;
      }
    | string,
  arg2?: string,
  arg3?: string
) {
  if (!isSmtpConfigured()) {
    console.warn("[mailer] SMTP not configured; skip sendMail()");
    return { skipped: true };
  }

  // verify が無くても / 失敗しても続行
  try {
    // @ts-expect-error: verify may not exist
    if (typeof transporter.verify === "function") {
      // @ts-ignore
      await transporter.verify();
    }
  } catch (err) {
    console.warn("[mailer] transporter.verify() failed, continue:", err);
  }

  // 1) 新しい呼び方: sendMail({ ... })
  if (typeof arg1 === "object") {
    const baseCfg = getMailerConfig();
    const from = arg1.from || baseCfg.from || baseCfg.user;
    return transporter.sendMail({
      ...arg1,
      from,
    });
  }

  // 2) 古い呼び方: sendMail(to, subject, html)
  const to = arg1;
  const subject = arg2 || "";
  const html = arg3;
  const baseCfg = getMailerConfig();
  const from = baseCfg.from || baseCfg.user;

  const message: any = { to, subject, from };
  if (html) {
    message.html = html;
  }
  return transporter.sendMail(message);
}
