import { NextResponse } from "next/server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { prisma } from "@/server/db/prisma";

import { createLoginCookie, verifyPassword, needsRehash, hashPassword } from "@/lib/auth";
import { findUserByEmailNormalized, normalizeEmail } from "@/lib/users";
import { respondDbNotInitializedWithLog } from "@/server/api/db-not-initialized";

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

    if (!email || !password) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await findUserByEmailNormalized(email);

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    }

    if (needsRehash(user.passwordHash)) {
      const passwordHash = await hashPassword(password);
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
