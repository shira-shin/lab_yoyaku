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
  const mailResult = await sendPasswordResetMail(targetEmail, resetUrl);

  if (mailResult.ok) {
    return NextResponse.json({
      ok: true,
      delivery: "sent" as const,
      resetUrl,
    });
  }

  const cfg = getSmtpConfig();
  const reason = mailResult.reason === "missing-config" ? "smtp-not-configured" : "smtp-failed";

  if (mailResult.reason === "missing-config") {
    console.warn("[auth/forgot-password] smtp not configured", {
      hasHost: !!cfg.host,
      hasPort: !!cfg.port,
      secure: cfg.secure,
      hasUser: !!cfg.user,
      hasPass: !!cfg.pass,
      hasFrom: !!cfg.from,
    });
  } else {
    console.error("[auth/forgot-password] send error", mailResult.error);
  }

  console.info(
    "[auth/forgot-password] manual reset URL available",
    {
      email: targetEmail,
      resetUrl,
      message: "このURLをブラウザで開けばリセットできます",
    },
  );

  return NextResponse.json({
    ok: false,
    reason,
    delivery: mailResult.reason === "missing-config" ? "skipped:missing-smtp" : "failed:send-error",
    resetUrl,
    smtp: {
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      hasUser: !!cfg.user,
      hasPass: !!cfg.pass,
      hasFrom: !!cfg.from,
      configured: isSmtpConfigured(),
    },
  });
}
