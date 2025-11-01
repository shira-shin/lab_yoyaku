import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const AUTH_DEBUG_TOKEN = process.env.AUTH_DEBUG_TOKEN;

type RequestBody = {
  token?: string;
  email?: string;
  newPassword?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as RequestBody;
  const { token, email, newPassword } = body;

  if (!AUTH_DEBUG_TOKEN || token !== AUTH_DEBUG_TOKEN) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!email || !newPassword) {
    return NextResponse.json({ ok: false, error: "email and newPassword required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: { normalizedEmail },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true, email: normalizedEmail });
}
