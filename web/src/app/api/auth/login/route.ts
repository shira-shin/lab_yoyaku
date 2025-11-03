import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { normalizeEmail } from "@/lib/email-normalize";
import { createLoginCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const rawEmail = typeof body?.email === "string" ? body.email : null;
  const password = typeof body?.password === "string" ? body.password : "";

  const email = normalizeEmail(rawEmail);

  if (!email) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json(
      { ok: false, error: "invalid-credentials" },
      { status: 401 }
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { normalizedEmail: email },
        { email: { equals: email, mode: "insensitive" } },
      ],
    },
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
    if (user.email !== email || user.normalizedEmail !== email) {
      await prisma.user.update({
        where: { id: user.id },
        data: { email, normalizedEmail: email },
      });
    }
    await createLoginCookie(user.id);
    return NextResponse.json({
      ok: true,
      via: "env-override",
      user: {
        id: user.id,
        email: email,
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

  if (user.email !== email || user.normalizedEmail !== email) {
    await prisma.user.update({
      where: { id: user.id },
      data: { email, normalizedEmail: email },
    });
  }

  await createLoginCookie(user.id);

  return NextResponse.json({
    ok: true,
    via: "password",
    user: {
      id: user.id,
      email,
    },
  });
}
