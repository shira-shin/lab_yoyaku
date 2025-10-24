import { NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";

import { createLoginCookie, normalizeEmail, verifyPassword, needsRehash, hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : null;
  const password = typeof body?.password === "string" ? body.password : null;

  if (!email || !password) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { normalizedEmail } });

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  if (needsRehash(user.passwordHash)) {
    const passwordHash = await hashPassword(password);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  }

  if (user.email !== email || user.normalizedEmail !== normalizedEmail) {
    await prisma.user.update({
      where: { id: user.id },
      data: { email, normalizedEmail },
    });
  }

  await createLoginCookie(user.id);

  return NextResponse.json({ ok: true });
}
