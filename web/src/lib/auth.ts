import crypto from "node:crypto";
import { cookies, headers } from "next/headers";

import { prisma } from "@/server/db/prisma";

import { hashPassword as hashWithCost, verifyPassword, needsRehash } from "./password";
import { normalizeEmail } from "./email";
import { SESSION_COOKIE_NAME } from "./auth/cookies";

const SESSION_COOKIE = SESSION_COOKIE_NAME;
const SESSION_TTL_DAYS = 30;

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export { normalizeEmail, verifyPassword, needsRehash };

export async function hashPassword(raw: string) {
  return hashWithCost(raw);
}

export function getClientMeta() {
  const h = headers();
  return {
    userAgent: h.get("user-agent") ?? undefined,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
  };
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = sha256(token);
  const { userAgent, ip } = getClientMeta();

  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId, tokenHash, userAgent, ip, expiresAt },
  });

  cookies().set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return;

  await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  cookies().delete(SESSION_COOKIE);
}

export async function getAuthUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    cookies().delete(SESSION_COOKIE);
    return null;
  }

  return session.user;
}

export async function requireAuthUser() {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function ensureUserEmail(userId: string, email: string) {
  const normalized = normalizeEmail(email);
  await prisma.user.update({
    where: { id: userId },
    data: { email, normalizedEmail: normalized },
  });
}

export { SESSION_COOKIE };
