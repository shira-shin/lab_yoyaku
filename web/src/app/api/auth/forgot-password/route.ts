import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { getBaseUrl } from "@/lib/get-base-url";
import { sendAuthMail } from "@/lib/auth/send-mail";

const TOKEN_TTL_MINUTES = 30;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

type MailProvider = "resend" | "sendgrid" | "smtp" | "none";

function detectMailProvider(): MailProvider {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SENDGRID_API_KEY) return "sendgrid";
  if (process.env.SMTP_HOST) return "smtp";
  return "none";
}

function resolveMailProvider(): MailProvider {
  if (process.env.AUTH_MAIL_PROVIDER) {
    const normalized = process.env.AUTH_MAIL_PROVIDER.toLowerCase();
    if (normalized === "none") return "none";
    if (normalized === "resend" || normalized === "sendgrid" || normalized === "smtp") {
      return normalized as MailProvider;
    }
    return "none";
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

  const token = crypto.randomBytes(32).toString("base64url");
  const baseUrl =
    process.env.AUTH_BASE_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  if (user) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: {
        tokenHash: hashToken(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000),
      },
    });
  }

  const envProvider = process.env.MAIL_PROVIDER?.toLowerCase();
  const provider =
    envProvider === "resend" ||
    envProvider === "sendgrid" ||
    envProvider === "smtp" ||
    envProvider === "none"
      ? (envProvider as MailProvider)
      : resolveMailProvider();

  if (provider === "none") {
    return NextResponse.json(
      {
        ok: true,
        resetUrl,
        delivery: "skipped:no-provider" as const,
      },
      { status: 200 },
    );
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
          delivery: `skipped:${mailResult.error ?? "delivery-failed"}`,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        resetUrl,
        delivery: "queued",
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      resetUrl,
      delivery: "skipped:user-not-found",
    },
    { status: 200 },
  );
}
