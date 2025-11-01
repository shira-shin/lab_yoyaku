import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : null;
  const passwordInput =
    typeof body?.password === "string"
      ? body.password
      : typeof body?.newPassword === "string"
        ? body.newPassword
        : null;

  if (!token || !passwordInput || passwordInput.length < 8) {
    return NextResponse.json({ ok: false, error: "token and password required" }, { status: 400 });
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true },
  });

  if (!record) {
    return NextResponse.json({ ok: false, error: "invalid token" }, { status: 400 });
  }

  if (record.expiresAt && record.expiresAt < new Date()) {
    return NextResponse.json({ ok: false, error: "token expired" }, { status: 400 });
  }

  const hash = await bcrypt.hash(passwordInput, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: hash },
    }),
    prisma.passwordResetToken.delete({
      where: { id: record.id },
    }),
  ]);

  return NextResponse.json({ ok: true }, { status: 200 });
}
