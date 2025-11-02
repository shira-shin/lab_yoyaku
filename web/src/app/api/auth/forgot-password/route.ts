import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { sendAppMail } from "@/lib/mailer";
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
  try {
    console.log("[forgot-password] sending mail to", targetEmail, "with url", resetUrl);

    await sendAppMail({
      to: targetEmail,
      subject: "Password reset",
      text: `Reset your password: ${resetUrl}`,
      html: `<p>Reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (err: any) {
    console.error("[forgot-password] ERROR", err?.message || err);
    return NextResponse.json(
      {
        ok: false,
        error: "MAIL_SEND_FAILED",
        detail: err?.message || String(err),
      },
      { status: 500 },
    );
  }
}
