import { NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";

import { createPasswordResetToken } from "@/lib/reset-token";
import { findUserByEmailNormalized } from "@/lib/users";

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
    const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    console.log("[RESET LINK]", resetUrl);
  }

  return NextResponse.json({ ok: true });
}
