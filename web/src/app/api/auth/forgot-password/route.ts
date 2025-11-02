import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { getSmtpConfig, isSmtpConfigured, sendPasswordResetMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const TOKEN_TTL_MINUTES = 30;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
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

  if (!user) {
    return NextResponse.json({
      ok: true,
      delivery: "skipped:user-not-found" as const,
      resetUrl: null,
    });
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const baseUrl =
    process.env.BASE_URL ||
    `https://${req.headers.get("host") ?? "labyoyaku.vercel.app"}`;
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000),
    },
  });

  const targetEmail = user.email ?? normalizedEmail;
  const smtpConfig = getSmtpConfig();
  const smtpConfigured = isSmtpConfigured();
  const smtpSnapshot = {
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    hasHost: !!smtpConfig.host,
    hasPort: !!smtpConfig.port,
    hasUser: !!smtpConfig.user,
    hasPass: !!smtpConfig.pass,
    hasFrom: !!smtpConfig.from,
    configured: smtpConfigured,
  };
  const manualResetLog = {
    email: targetEmail,
    resetUrl,
    message: "このURLをブラウザで開けばリセットできます",
  };

  if (!smtpConfigured) {
    console.warn("[auth/forgot-password] SMTP not configured, skipping actual send", {
      hasHost: !!smtpConfig.host,
      hasPort: !!smtpConfig.port,
      secure: smtpConfig.secure,
      hasUser: !!smtpConfig.user,
      hasPass: !!smtpConfig.pass,
      hasFrom: !!smtpConfig.from,
      configured: smtpConfigured,
    });
    console.info("[auth/forgot-password] manual reset URL available", manualResetLog);
    return NextResponse.json({
      ok: true,
      delivery: "skipped:missing-smtp" as const,
      resetUrl,
      sent: false,
    });
  }

  const mailResult = await sendPasswordResetMail(targetEmail, resetUrl);

  if (mailResult.ok === false) {
    const { reason, error } = mailResult;

    if (reason === "missing-config") {
      console.warn("[auth/forgot-password] SMTP reported missing config at send time", {
        hasHost: !!smtpConfig.host,
        hasPort: !!smtpConfig.port,
        secure: smtpConfig.secure,
        hasUser: !!smtpConfig.user,
        hasPass: !!smtpConfig.pass,
        hasFrom: !!smtpConfig.from,
        configured: smtpConfigured,
      });
      console.info("[auth/forgot-password] manual reset URL available", manualResetLog);
      return NextResponse.json({
        ok: true,
        delivery: "skipped:missing-smtp" as const,
        resetUrl,
        sent: false,
      });
    }

    console.error("[auth/forgot-password] send error", error);
    console.info("[auth/forgot-password] manual reset URL available", manualResetLog);

    return NextResponse.json({
      ok: false,
      reason: "smtp-failed" as const,
      delivery: "failed:send-error" as const,
      resetUrl,
      sent: false,
      smtp: smtpSnapshot,
    });
  }

  return NextResponse.json({
    ok: true,
    delivery: "sent" as const,
    resetUrl,
    sent: true,
  });
}
