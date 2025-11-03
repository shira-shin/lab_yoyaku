import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/users";

export const runtime = "nodejs";

const RESET_SECRET =
  process.env.PASSWORD_RESET_SECRET || process.env.AUTH_SECRET || process.env.JWT_SECRET || "";

type ResetPayload = {
  email: string;
  exp: number;
  sig: string;
};

type VerifiedToken = { ok: true; email: string } | { ok: false };

function decodeToken(token: string): ResetPayload | null {
  try {
    const segment = token.split(".").pop() ?? token;
    const raw = Buffer.from(segment, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as ResetPayload;

    if (typeof parsed.email !== "string" || parsed.email.length === 0) return null;
    if (typeof parsed.sig !== "string" || parsed.sig.length === 0) return null;
    if (typeof parsed.exp !== "number") return null;

    return parsed;
  } catch (error) {
    console.error("[reset-password] token decode error", error);
    return null;
  }
}

function verifyToken(token: string): VerifiedToken {
  const payload = decodeToken(token);
  if (!payload) return { ok: false };

  if (!RESET_SECRET) {
    console.error("[reset-password] missing PASSWORD_RESET_SECRET/AUTH_SECRET");
    return { ok: false };
  }

  if (Date.now() > payload.exp * 1000) {
    return { ok: false };
  }

  const expected = crypto
    .createHmac("sha256", RESET_SECRET)
    .update(`${payload.email}:${payload.exp}`)
    .digest("hex");

  if (expected.length !== payload.sig.length) {
    return { ok: false };
  }

  try {
    const expectedBuf = Buffer.from(expected, "hex");
    const sigBuf = Buffer.from(payload.sig, "hex");

    if (!crypto.timingSafeEqual(expectedBuf, sigBuf)) {
      return { ok: false };
    }
  } catch (error) {
    console.error("[reset-password] timingSafeEqual error", error);
    return { ok: false };
  }

  return { ok: true, email: payload.email };
}

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

    const verified = verifyToken(token);
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
