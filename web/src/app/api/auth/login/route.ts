import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { createLoginCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const rawEmail = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const email = rawEmail.trim().toLowerCase();

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "invalid-credentials" },
      { status: 401 }
    );
  }

  console.log("[auth/login] using db url", process.env.DATABASE_URL);

  const user = await prisma.user.findUnique({
    where: { normalizedEmail: email },
    select: {
      id: true,
      email: true,
      normalizedEmail: true,
      passwordHash: true,
    },
  });

  if (!user || !user.passwordHash) {
    return NextResponse.json(
      { ok: false, error: "invalid-credentials" },
      { status: 401 }
    );
  }

  const override = process.env.AUTH_PASSWORD_OVERRIDE;
  if (override && password === override) {
    await createLoginCookie(user.id);
    return NextResponse.json({
      ok: true,
      via: "env-override",
      user: {
        id: user.id,
        email: user.email ?? user.normalizedEmail,
      },
    });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    console.warn("[auth/login] bcrypt.compare failed", {
      id: user.id,
      email: user.email,
      normalizedEmail: user.normalizedEmail,
      attemptedPasswordLength: password.length,
      hashPreview: user.passwordHash.slice(0, 12) + "...",
      hashLength: user.passwordHash.length,
      bcryptLib: "bcryptjs",
      hashPrefix: user.passwordHash.slice(0, 7),
    });
    return NextResponse.json(
      { ok: false, error: "invalid-credentials" },
      { status: 401 }
    );
  }

  await createLoginCookie(user.id);

  return NextResponse.json({
    ok: true,
    via: "password",
    user: {
      id: user.id,
      email: user.email ?? user.normalizedEmail,
    },
  });
}
