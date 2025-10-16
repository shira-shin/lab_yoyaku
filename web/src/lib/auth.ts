import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./auth-legacy";

export { auth, signIn, signOut } from "@/lib/nextauth";
export { auth as getServerSession } from "@/lib/nextauth";

export {
  readUserFromCookie,
  decodeSession,
  findUserByEmail,
  signToken,
  SESSION_COOKIE,
} from "./auth-legacy";

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

export { normalizeEmail } from "./email";
export { verifyPassword, needsRehash, hashPassword } from "./password";
