/* COOKIES-WRITE-MIGRATION:
   - このファイルで cookies().set/delete を使っていますが、Next.js 14 では
     Server Action か Route Handler でのみ許可されています。
   - 置き換え案（簡単）: クライアント側から
       import { setCookie, deleteCookie } from "@/lib/cookies-client";
       await setCookie("name", "value", { path:"/" });
     ※ レンダー中(関数本体直下)では呼ばず、イベントやエフェクトで呼んでください。
*/
import { cookies } from "next/headers";

import { prisma } from "@/server/db/prisma";

import { hashPassword as hashWithCost, verifyPassword, needsRehash } from "./password";
import { normalizeEmail } from "./users";
import { SESSION_COOKIE_NAME } from "./auth/cookies";
import { deleteCookie } from "@/lib/cookies-client";

const SESSION_COOKIE = SESSION_COOKIE_NAME;
const SESSION_TTL_DAYS = 30;

export { normalizeEmail, verifyPassword, needsRehash };

export async function hashPassword(raw: string) {
  return hashWithCost(raw);
}

export async function createLoginCookie(userId: string) {
  const cookieStore = cookies();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  cookieStore.set({
    name: SESSION_COOKIE,
    value: userId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearLoginCookie() {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getAuthUser() {
  const cookieStore = cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    try {
      await deleteCookie(SESSION_COOKIE);
    } catch (error) {
      console.error("[auth] failed to delete invalid session cookie", error);
    }
    return null;
  }

  return user;
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
    data: { email: email.trim(), normalizedEmail: normalized },
  });
}

export { SESSION_COOKIE };
