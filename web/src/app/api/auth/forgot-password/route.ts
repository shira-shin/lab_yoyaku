import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { sendAuthMail } from "@/lib/auth/send-mail";

const TOKEN_TTL_MINUTES = 30;

type MailProvider = "resend" | "sendgrid" | "smtp" | "none";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function detectMailProvider(): MailProvider {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SENDGRID_API_KEY) return "sendgrid";
  if (process.env.SMTP_HOST) return "smtp";
  return "none";
}

function resolveMailProvider(): MailProvider {
  const envProvider = process.env.MAIL_PROVIDER?.toLowerCase();
  if (!envProvider) {
    return detectMailProvider();
  }
  if (envProvider === "none") return "none";
  if (envProvider === "resend" || envProvider === "sendgrid" || envProvider === "smtp") {
    return envProvider as MailProvider;
  }
  return detectMailProvider();
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : null;

  if (!email) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { normalizedEmail },
    select: { id: true, email: true },
  });

  const resetToken = crypto.randomBytes(32).toString("base64url");

  if (user) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: {
        tokenHash: hashToken(resetToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000),
      },
    });
  }

  const host = req.headers.get("host");
  const baseUrl = process.env.BASE_URL || (host ? `https://${host}` : "http://localhost:3000");
  const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const provider = resolveMailProvider();

  if (provider === "none") {
    return NextResponse.json({
      ok: true,
      delivery: "skipped:no-provider" as const,
      resetUrl,
      reason: "MAIL_PROVIDER is none, so email was not sent.",
    });
  }

  if (provider === "smtp") {
    const hasSmtp =
      !!process.env.SMTP_HOST &&
      !!process.env.SMTP_USER &&
      !!process.env.SMTP_PASS;
    if (!hasSmtp) {
      return NextResponse.json(
        {
          ok: false,
          delivery: "skipped:missing-smtp-config" as const,
          resetUrl,
          reason: "SMTP configuration is incomplete, so email was not sent.",
        },
        { status: 500 }
      );
    }
  }

  if (user) {
    const mailResult = await sendAuthMail({
      to: user.email ?? email,
      subject: "パスワード再設定", // Password reset
      text: `パスワード再設定はこちら: ${resetUrl}`,
      html: `<p>パスワード再設定はこちらから行ってください。</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });

    if (!mailResult.delivered) {
      return NextResponse.json(
        {
          ok: true,
          resetUrl,
          delivery: `skipped:${mailResult.error ?? "delivery-failed"}` as const,
          reason:
            mailResult.error === "no-provider"
              ? "MAIL_PROVIDER is none, so email was not sent."
              : mailResult.error ?? "Mail delivery failed.",
        },
        mailResult.error === "no-provider" ? undefined : { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    resetUrl,
    delivery: "sent" as const,
  });
}
