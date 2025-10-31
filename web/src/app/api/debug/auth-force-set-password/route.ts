import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/server/db/prisma";

const DEBUG_TOKEN = process.env.AUTH_DEBUG_TOKEN;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : null;
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : null;
  const token = typeof body?.token === "string" ? body.token : null;

  if (!DEBUG_TOKEN || token !== DEBUG_TOKEN) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!email || !newPassword) {
    return NextResponse.json({ ok: false, error: "email and newPassword are required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: { normalizedEmail },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 });
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hash,
    },
  });

  return NextResponse.json({ ok: true, id: user.id }, { status: 200 });
}
