/**
 * Compatibility shim so existing imports from "@/lib/auth" keep working.
 * - Re-exports NextAuth v5 helpers
 * - Re-exports legacy cookie/session helpers that still exist
 * - Provides thin shims for setSessionCookie / clearSessionCookie / hashPassword
 */

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

// ---- NextAuth v5 helpers ----
export { auth } from "@/auth";
// v4 の getServerSession 相当
export { auth as getServerSession } from "@/auth";

// ---- Legacy helpers that actually exist in ./auth-legacy ----
export {
  readUserFromCookie,
  decodeSession,
  findUserByEmail,
  signToken,
  SESSION_COOKIE,
} from "./auth-legacy";

// ---- Thin shims for legacy API names that some routes still import ----
import { SESSION_COOKIE as _SESSION_COOKIE } from "./auth-legacy";

/** Set session cookie (simple shim; adjust options if you had stricter ones) */
export function setSessionCookie(value: string) {
  cookies().set(_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/** Clear session cookie */
export function clearSessionCookie() {
  // cookies().delete は Next 14.2+。14.1 互換で明示上書きしてもOK。
  cookies().set(_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

/** Provide hashPassword since ./password exports only verifyPassword / needsRehash */
export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

// ---- Re-export helpers other modules expect from here ----
export { normalizeEmail } from "./email";
export { verifyPassword, needsRehash } from "./password";
