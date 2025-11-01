import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// must be set in Vercel env
const DEBUG_TOKEN = process.env.AUTH_DEBUG_TOKEN || process.env.DEBUG_TOKEN;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { token, email, password } = body as {
    token?: string;
    email?: string;
    password?: string;
  };

  if (!DEBUG_TOKEN) {
    return NextResponse.json(
      { ok: false, error: "AUTH_DEBUG_TOKEN not set" },
      { status: 500 },
    );
  }

  if (token !== DEBUG_TOKEN) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "email and password required" },
      { status: 400 },
    );
  }

  const normalizedEmail = email.toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);

  // see if user exists
  const existing = await prisma.user.findFirst({
    where: { normalizedEmail },
    select: { id: true },
  });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        email,
        normalizedEmail,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        normalizedEmail: true,
      },
    });

    return NextResponse.json({ ok: true, created: false, user: updated });
  }

  // create new user if not exists
  const created = await prisma.user.create({
    data: {
      email,
      normalizedEmail,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      normalizedEmail: true,
    },
  });

  return NextResponse.json({ ok: true, created: true, user: created });
}
