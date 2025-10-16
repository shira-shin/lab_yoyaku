import { cookies } from "next/headers";
import NextAuth from "next-auth";

import { authConfig } from "@/app/api/auth/[...nextauth]/route";
import { SESSION_COOKIE } from "./auth-legacy";

export const { auth, signIn, signOut } = NextAuth(authConfig);
export const getServerSession = auth;

export {
  readUserFromCookie,
  decodeSession,
  findUserByEmail,
  signToken,
  SESSION_COOKIE,
} from "./auth-legacy";

export { normalizeEmail } from "./email";
export { verifyPassword, needsRehash, hashPassword } from "./password";

export function setSessionCookie(value: string) {
  cookies().set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
