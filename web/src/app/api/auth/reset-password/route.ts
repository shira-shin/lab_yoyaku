import { NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";

import { destroySession, hashPassword } from "@/lib/auth";
import { consumePasswordResetToken } from "@/lib/reset-token";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : null;
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : null;

  if (!token || !newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const userId = await consumePasswordResetToken(token);
  if (!userId) {
    return NextResponse.json({ error: "invalid or expired token" }, { status: 400 });
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await prisma.session.deleteMany({ where: { userId } });
  await destroySession();

  return NextResponse.json({ ok: true });
}
