import "server-only";

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { readUserFromCookie as _readUserFromCookie } from "../auth-legacy";
export { readUserFromCookie } from "../auth-legacy";

const authConfig = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
});

export const { auth, signIn, signOut } = authConfig;

export async function getUserFromCookies() {
  return _readUserFromCookie();
}
