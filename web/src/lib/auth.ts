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

import { getBaseUrl } from "@/lib/get-base-url";

import {
  hashPassword as hashWithCost,
  verifyPassword,
  needsRehash,
  detectPasswordHashType,
  DEFAULT_BCRYPT_COST,
} from "./password";
import { normalizeEmail } from "./users";
import { SESSION_COOKIE_NAME } from "./auth/cookies";

const SESSION_COOKIE = SESSION_COOKIE_NAME;
const SESSION_TTL_DAYS = 30;

function extractHost(value: string | undefined | null) {
  if (!value) return null;
  try {
    if (value.includes("://")) {
      return new URL(value).host;
    }
    return new URL(`https://${value}`).host;
  } catch {
    return null;
  }
}

async function deleteSessionCookieViaRoute() {
  const baseUrl = getBaseUrl();

  if (typeof window !== "undefined") {
    const windowHost = extractHost(window.location.origin);
    const configuredClientBase =
      process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? null;
    const allowedHost = extractHost(configuredClientBase ?? baseUrl);

    if (allowedHost && windowHost && allowedHost !== windowHost) {
      return;
    }
  }

  const targetHost = extractHost(baseUrl);
  if (!targetHost) {
    return;
  }

  const deploymentHost =
    extractHost(process.env.VERCEL_URL ?? null) ??
    extractHost(process.env.AUTH_BASE_URL ?? null) ??
    extractHost(process.env.APP_URL ?? null) ??
    extractHost(process.env.NEXT_PUBLIC_APP_URL ?? null) ??
    extractHost(process.env.APP_BASE_URL ?? null);

  if (deploymentHost && deploymentHost !== targetHost) {
    return;
  }

  try {
    const res = await fetch(`${baseUrl}/api/cookies/delete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: SESSION_COOKIE,
        options: { path: "/" },
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn("[auth] cookie delete route returned non-200", res.status);
    }
  } catch (error) {
    console.warn("[auth] failed to delete invalid session cookie via route", error);
  }
}

export {
  normalizeEmail,
  verifyPassword,
  needsRehash,
  detectPasswordHashType,
  DEFAULT_BCRYPT_COST,
};

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
    await deleteSessionCookieViaRoute();
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
