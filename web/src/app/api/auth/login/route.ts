import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { prisma } from "@/server/db/prisma";

import {
  createLoginCookie,
  verifyPassword,
  needsRehash,
  hashPassword,
  normalizeEmail,
  detectPasswordHashType,
} from "@/lib/auth";
import { respondDbNotInitializedWithLog } from "@/server/api/db-not-initialized";
import { getBaseUrl } from "@/lib/get-base-url";

function isP2021UserTable(err: unknown): err is PrismaClientKnownRequestError {
  return (
    err instanceof PrismaClientKnownRequestError &&
    err.code === "P2021" &&
    String(err.meta?.table ?? "").includes("public.User")
  );
}

function logRuntimeDbDetails() {
  const runtimeUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
  console.error("[P2021] User table missing", {
    host: runtimeUrl?.hostname,
    db: runtimeUrl?.pathname,
    hasPooler: runtimeUrl?.hostname?.includes("-pooler."),
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim() : null;
    const password = typeof body?.password === "string" ? body.password : null;

    const baseUrl = getBaseUrl();
    console.log("[auth/login] baseUrl=", baseUrl);
    console.log("[auth/login] body.email=", email);

    if (!email || !password) {
      console.warn("[auth/login] invalid payload (email or password missing)");
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    console.log("[auth/login] normalizedEmail=", normalizedEmail);
    const user = await prisma.user.findUnique({
      where: { normalizedEmail },
    });

    if (!user || !user.passwordHash) {
      if (!user) {
        console.warn(
          "[auth/login] user not found for normalizedEmail=",
          normalizedEmail
        );
      } else {
        console.warn("[auth/login] user has no passwordHash", {
          id: user.id,
          email: user.email,
          normalizedEmail: user.normalizedEmail,
        });
      }
      return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    }

    const override = process.env.AUTH_PASSWORD_OVERRIDE;
    if (override && password === override) {
      console.warn("[auth/login] password override used", {
        id: user.id,
        email: user.email,
        normalizedEmail: user.normalizedEmail,
      });
      await createLoginCookie(user.id);
      return NextResponse.json({
        ok: true,
        via: "override",
      });
    }

    const hashPreview = user.passwordHash.slice(0, 15) + "...";
    const hashLength = user.passwordHash.length;
    const hashType = detectPasswordHashType(user.passwordHash);

    if (hashType === "unknown") {
      console.warn("[auth/login] unsupported password hash format", {
        id: user.id,
        email: user.email,
        normalizedEmail: user.normalizedEmail,
        hashPreview,
        hashLength,
      });
      return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    }

    if (hashType === "bcrypt") {
      try {
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          console.warn("[auth/login] bcrypt.compare failed", {
            id: user.id,
            email: user.email,
            normalizedEmail: user.normalizedEmail,
            attemptedPasswordLength: password ? password.length : 0,
            hashPreview,
            hashLength,
            bcryptLib: "bcryptjs",
            hashPrefix: user.passwordHash.slice(0, 7),
          });
          return NextResponse.json(
            { error: "invalid credentials" },
            { status: 401 }
          );
        }
      } catch (err) {
        console.error("[auth/login] bcrypt.compare threw", {
          id: user.id,
          err,
        });
        return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
      }
    } else {
      let ok = false;
      try {
        ok = await verifyPassword(password, user.passwordHash);
      } catch (err) {
        console.error("[auth/login] verifyPassword threw", {
          id: user.id,
          err,
        });
        return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
      }

      if (!ok) {
        console.warn("[auth/login] legacy password mismatch", {
          id: user.id,
          email: user.email,
          normalizedEmail: user.normalizedEmail,
          hashPreview,
          hashLength,
          hashType,
        });
        return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
      }
    }

    if (needsRehash(user.passwordHash)) {
      const passwordHash = await hashPassword(password);
      console.log("[auth/login] rehashing password for user id=", user.id);
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    }

    // Prisma の User.email は String? なので null 安全に比較
    if (user.normalizedEmail !== normalizedEmail || (user.email ?? "") !== email) {
      await prisma.user.update({
        where: { id: user.id },
        data: { email, normalizedEmail },
      });
    }

    await createLoginCookie(user.id);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (isP2021UserTable(err)) {
      logRuntimeDbDetails();
      return respondDbNotInitializedWithLog("api.auth.login");
    }
    throw err;
  }
}
