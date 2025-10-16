import { cookies } from "next/headers";
import { getServerSession as nextGetServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { SESSION_COOKIE } from "./auth-legacy";

export const auth = () => nextGetServerSession(authOptions);
export const getServerSession = () => nextGetServerSession(authOptions);
export const getSessionServer = () => nextGetServerSession(authOptions);

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
