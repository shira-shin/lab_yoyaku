import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/users";

const DEBUG_TOKEN = process.env.AUTH_DEBUG_TOKEN;

export async function POST(req: Request) {
  if (!DEBUG_TOKEN) {
    return NextResponse.json(
      { ok: false, error: "AUTH_DEBUG_TOKEN not set" },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "invalid json" },
      { status: 400 },
    );
  }

  const { email, newPassword, token } = body as {
    email?: string;
    newPassword?: string;
    token?: string;
  };

  if (token !== DEBUG_TOKEN) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  if (!email || !newPassword) {
    return NextResponse.json(
      { ok: false, error: "email and newPassword are required" },
      { status: 400 },
    );
  }

  const normalizedEmail = normalizeEmail(email);

  const user = await prisma.user.findFirst({
    where: { normalizedEmail },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, error: `user not found for ${normalizedEmail}` },
      { status: 404 },
    );
  }

  const hash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hash,
      normalizedEmail,
      email,
    },
  });

  return NextResponse.json({
    ok: true,
    id: user.id,
    normalizedEmail,
  });
}
