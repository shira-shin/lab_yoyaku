import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const DEBUG_TOKEN = process.env.AUTH_DEBUG_TOKEN || "shira-debug-2025";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { token, email, password } = body as {
    token?: string;
    email?: string;
    password?: string;
  };

  if (!token || token !== DEBUG_TOKEN) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "email and password are required" },
      { status: 400 },
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { normalizedEmail },
    update: { passwordHash },
    create: {
      email: normalizedEmail,
      normalizedEmail,
      passwordHash,
      name: normalizedEmail,
    },
    select: {
      id: true,
      email: true,
      normalizedEmail: true,
      passwordHash: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, user });
}
