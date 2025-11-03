import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyResetToken } from "@/lib/reset-token";
import { normalizeEmail } from "@/lib/users";

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

    console.info("[reset-password] datasource", {
      DIRECT_URL: Boolean(process.env.DIRECT_URL),
      using: (process.env.DIRECT_URL || process.env.DATABASE_URL || "").split("@").pop(),
    });

    const normalized = normalizeEmail(verified.email);
    const user = await prisma.user.findUnique({
      where: { normalizedEmail: normalized },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }

    const hash = await bcrypt.hash(passwordInput, 12);

    const updateData: { passwordHash: string; emailVerified?: Date } = {
      passwordHash: hash,
    };

    if (!user.emailVerified) {
      updateData.emailVerified = new Date();
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email ?? verified.email },
    });
  } catch (error) {
    console.error("[reset-password] ERROR", error);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
