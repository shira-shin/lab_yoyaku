import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { normalizeEmail } from "@/lib/users";
import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";

const RESET_SECRET = process.env.PASSWORD_RESET_SECRET || "dev-secret-change-me";

type ResetPayload = { email: string; exp: number; sig: string };

function verifyToken(token: string) {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as ResetPayload;
    if (!parsed.email || !parsed.sig || !parsed.exp) return null;

    const payload = `${parsed.email}:${parsed.exp}`;
    const expected = crypto.createHmac("sha256", RESET_SECRET).update(payload).digest("hex");
    if (expected !== parsed.sig) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;

    return parsed.email;
  } catch (error) {
    console.error("[reset-password] verifyToken error", error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { token, newPassword, password } = await req.json();
    const passwordInput = typeof newPassword === "string" ? newPassword : password;

    if (!token || typeof token !== "string" || !passwordInput || passwordInput.length < 8) {
      return NextResponse.json(
        { ok: false, error: "token and password required" },
        { status: 400 },
      );
    }

    const email = verifyToken(token);
    if (!email) {
      return NextResponse.json({ ok: false, error: "INVALID_OR_EXPIRED" }, { status: 400 });
    }

    const normalized = normalizeEmail(email);
    const user = await prisma.user.findUnique({
      where: { normalizedEmail: normalized },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }

    const hash = await bcrypt.hash(passwordInput, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash },
    });

    console.log("[reset-password] token verified for", email);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[reset-password] ERROR", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
