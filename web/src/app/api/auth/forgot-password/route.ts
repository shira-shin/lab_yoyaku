import { NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";

import { createPasswordResetToken } from "@/lib/reset-token";
import { findUserByEmailNormalized } from "@/lib/users";
import { getBaseUrl } from "@/lib/get-base-url";

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

    const hasMailProvider = Boolean(
      process.env.SMTP_HOST ||
        process.env.RESEND_API_KEY ||
        process.env.SENDGRID_API_KEY
    );

    if (!hasMailProvider) {
      return NextResponse.json(
        {
          ok: true,
          resetUrl,
          note: "email not sent, provider not configured",
        },
        { status: 200 }
      );
    }

    // TODO: connect to configured mail provider.
  }

  return NextResponse.json({ ok: true });
}
