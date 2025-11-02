import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { sendMail } from "@/lib/mailer";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://labyoyaku.vercel.app";
const RESET_SECRET = process.env.PASSWORD_RESET_SECRET || "dev-secret-change-me";
const TOKEN_TTL_SEC = 60 * 30;

function makeResetToken(email: string) {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  const payload = `${email}:${exp}`;
  const sig = crypto.createHmac("sha256", RESET_SECRET).update(payload).digest("hex");
  const raw = JSON.stringify({ email, exp, sig });
  return Buffer.from(raw).toString("base64url");
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ ok: false, error: "EMAIL_REQUIRED" }, { status: 400 });
    }

    const targetEmail = email.trim();
    const token = makeResetToken(targetEmail);
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;

    console.log("[forgot-password] will send mail", { email: targetEmail, resetUrl });

    await sendMail(
      targetEmail,
      "Password reset",
      `<p>To reset your password, click the link below (valid 30min):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[forgot-password] ERROR", err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 },
    );
  }
}
