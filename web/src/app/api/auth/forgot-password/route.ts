import { NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";

import { createPasswordResetToken } from "@/lib/reset-token";
import { findUserByEmailNormalized } from "@/lib/users";
import { getBaseUrl } from "@/lib/get-base-url";
import { sendAuthMail } from "@/lib/auth/send-mail";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : null;

  if (!email) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const user = await findUserByEmailNormalized(email);

  if (user) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    const token = await createPasswordResetToken(user.id, 60);
    const baseUrl = getBaseUrl();
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    console.log("[RESET LINK]", resetUrl);

    const mailResult = await sendAuthMail({
      to: user.email ?? email,
      subject: "パスワード再設定", // Password reset
      text: `パスワード再設定はこちら: ${resetUrl}`,
      html: `<p>パスワード再設定はこちらから行ってください。</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });

    if (!mailResult.delivered) {
      const note =
        mailResult.error === "no-provider"
          ? "email not sent, provider not configured"
          : `email not sent (${mailResult.error ?? "delivery failed"})`;

      return NextResponse.json(
        {
          ok: true,
          resetUrl,
          note,
        },
        { status: 200 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
