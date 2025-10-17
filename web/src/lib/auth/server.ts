import "server-only";

import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

import { readUserFromCookie as _readUserFromCookie } from "../auth-legacy";

const config: NextAuthConfig = {
  trustHost: true,
  secret: process.env.APP_AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    }),
  ],
};

export const { auth, signIn, signOut } = NextAuth(config);
export { readUserFromCookie } from "../auth-legacy";

export async function getUserFromCookies() {
  return _readUserFromCookie();
}
