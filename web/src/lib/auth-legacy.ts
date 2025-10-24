import "server-only";

import { prisma } from "@/server/db/prisma";

import { getAuthUser, normalizeEmail } from "./auth";
import { SESSION_COOKIE_NAME } from "./auth/cookies";

export type User = { id: string; name: string; email: string };

export const SESSION_COOKIE_LEGACY = SESSION_COOKIE_NAME;
export const SESSION_COOKIE_NAME_LEGACY = SESSION_COOKIE_NAME;
export { SESSION_COOKIE } from "./auth";
export { normalizeEmail };

export async function readUserFromCookie(): Promise<User | null> {
  const user = await getAuthUser();
  if (!user?.email) return null;
  return { id: user.id, email: user.email, name: user.name ?? "" };
}

export async function auth() {
  const user = await readUserFromCookie();
  if (!user) return null;
  return { user };
}

export async function getAuthContext() {
  return auth();
}

export async function findUserByEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  return prisma.user.findUnique({ where: { normalizedEmail: normalized } });
}
