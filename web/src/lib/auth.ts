import "server-only";
import { createHash } from "crypto";
import type { Session } from "next-auth";
import { auth as nextAuth } from "@/auth";
import { prisma } from "@/server/prisma";
import { loadUsers } from "./db";
import { normalizeEmail } from "./email";

export type User = NonNullable<Session["user"]>;

export { normalizeEmail } from "./email";

export const hashPassword = (pw: string) =>
  createHash("sha256").update(pw).digest("hex");

export async function readUserFromCookie(): Promise<User | null> {
  const session = await nextAuth();
  return session?.user ?? null;
}

export async function auth() {
  return nextAuth();
}

export async function getServerSession() {
  return nextAuth();
}

export async function findUserByEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  try {
    const user = await prisma.user.findUnique({ where: { normalizedEmail: normalized } });
    if (user) {
      return user;
    }
  } catch {
    /* ignore */
  }

  try {
    const users = await loadUsers();
    return users.find((candidate) => normalizeEmail(candidate.email) === normalized) || null;
  } catch {
    return null;
  }
}
