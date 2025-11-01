import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

const DEBUG_TOKEN = process.env.AUTH_DEBUG_TOKEN;
const SALT_ROUNDS = 12;

type RequestBody = {
  token?: string;
  email?: string;
  password?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as RequestBody;
  const { token, email, password } = body;

  if (!DEBUG_TOKEN || token !== DEBUG_TOKEN) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "email and password required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  let user = await prisma.user.findFirst({
    where: { normalizedEmail },
    select: { id: true },
  });

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        normalizedEmail,
        passwordHash,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, created: true, id: user.id });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true, created: false, id: user.id });
}
