import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const DEBUG_TOKEN = process.env.AUTH_DEBUG_TOKEN;

export async function POST(req: Request) {
  if (!DEBUG_TOKEN) {
    return NextResponse.json(
      { ok: false, error: "AUTH_DEBUG_TOKEN is not set" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (token !== DEBUG_TOKEN) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const email = "debug@example.com";
  const normalizedEmail = email.toLowerCase();
  const password = "Passw0rd!";
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findFirst({
    where: { normalizedEmail },
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      existed: true,
      user: {
        id: existing.id,
        email: existing.email,
        normalizedEmail: existing.normalizedEmail,
      },
      loginExample: {
        email,
        password,
      },
    });
  }

  const user = await prisma.user.create({
    data: {
      email,
      normalizedEmail,
      passwordHash,
      // role: "ADMIN", // スキーマにroleがあるならつける
    },
  });

  return NextResponse.json({
    ok: true,
    created: true,
    user: {
      id: user.id,
      email: user.email,
      normalizedEmail: user.normalizedEmail,
    },
    loginExample: {
      email,
      password,
    },
  });
}
