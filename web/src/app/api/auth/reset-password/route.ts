import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { normalizeEmail } from "@/lib/email-normalize";
import { prisma } from "@/lib/prisma";
import { verifyResetToken } from "@/lib/reset-token";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const tokenFromQuery = url.searchParams.get("token") ?? undefined;
    const body = (await req.json().catch(() => ({}))) as {
      token?: string;
      password?: string;
      newPassword?: string;
    };

    const token = typeof body.token === "string" ? body.token : tokenFromQuery;
    const passwordInput =
      typeof body.newPassword === "string" && body.newPassword.length > 0
        ? body.newPassword
        : body.password;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });
    }

    if (!passwordInput || typeof passwordInput !== "string") {
      return NextResponse.json({ ok: false, error: "password required" }, { status: 400 });
    }

    if (passwordInput.length < 8) {
      return NextResponse.json({ ok: false, error: "PASSWORD_TOO_SHORT" }, { status: 400 });
    }

    const verified = verifyResetToken(token);
    if (!verified.ok) {
      return NextResponse.json({ ok: false, error: "INVALID_OR_EXPIRED" }, { status: 400 });
    }

    const normEmail = normalizeEmail(verified.email);
    if (!normEmail) {
      return NextResponse.json({ error: "invalid email" }, { status: 400 });
    }

    console.info("[reset-password] datasource", {
      DIRECT_URL: Boolean(process.env.DIRECT_URL),
      using: (process.env.DIRECT_URL || process.env.DATABASE_URL || "").split("@").pop(),
    });

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { normalizedEmail: normEmail },
          { email: { equals: normEmail, mode: "insensitive" } },
        ],
      },
      select: { id: true, email: true, emailVerified: true },
    });

    const hash = await bcrypt.hash(passwordInput, 10);

    if (!user) {
      if (process.env.ALLOW_RESET_PROVISION === "true") {
        user = await prisma.user.create({
          data: {
            email: normEmail,
            normalizedEmail: normEmail,
            passwordHash: hash,
            emailVerified: new Date(),
          },
          select: { id: true, email: true, emailVerified: true },
        });
      } else {
        return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
      }
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hash,
          email: normEmail,
          normalizedEmail: normEmail,
          ...(user.emailVerified ? {} : { emailVerified: new Date() }),
        },
      });
      user = { ...user, email: normEmail, emailVerified: user.emailVerified ?? new Date() };
    }

    return NextResponse.json({ ok: true, user: { id: user.id, email: normEmail } });
  } catch (error) {
    console.error("[reset-password] ERROR", error);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
