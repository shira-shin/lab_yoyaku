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
  return {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: isGmail587 ? false : SMTP_PORT === 465,
    auth:
      SMTP_USER && SMTP_PASS
        ? {
            user: SMTP_USER,
            pass: SMTP_PASS,
          }
        : undefined,
  };
}

export function isSmtpConfigured() {
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);
}

const transporter = nodemailer.createTransport(getMailerConfig());

// これを各APIが使う
export async function sendMail(opts: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}) {
  if (!isSmtpConfigured()) {
    console.warn("[mailer] SMTP not configured; skip sendMail()");
    return { skipped: true };
  }

  // verify が無い/失敗しても落とさない
  try {
    // @ts-expect-error: verify may not exist on some transports
    if (typeof transporter.verify === "function") {
      // @ts-ignore
      await transporter.verify();
    }
  } catch (err) {
    console.warn("[mailer] transporter.verify() failed, continue:", err);
  }

  const from =
    opts.from || process.env.MAIL_FROM || process.env.EMAIL_FROM || SMTP_USER;

  return transporter.sendMail({
    ...opts,
    from,
  });
}
