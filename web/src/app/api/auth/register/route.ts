import { NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";

import { createLoginCookie, hashPassword, normalizeEmail } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : null;
  const password = typeof body?.password === "string" ? body.password : null;
  const name = typeof body?.name === "string" ? body.name : null;

  if (!email || !password) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "password too short" }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(email);

  const existing = await prisma.user.findFirst({
    where: { email: { in: [normalizedEmail, email] } },
  });

  if (existing) {
    return NextResponse.json({ error: "email already used" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name,
      passwordHash,
    },
  });

  await createLoginCookie(user.id);

  return NextResponse.json({ ok: true });
}
