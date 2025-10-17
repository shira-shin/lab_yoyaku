import "server-only";

import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

import { readUserFromCookie as _readUserFromCookie } from "../auth-legacy";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: process.env.APP_AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    }),
  ],
};

const {
  auth,
  handlers,
  signIn,
  signOut,
} = NextAuth(authConfig);

export { auth, handlers, signIn, signOut };
export { readUserFromCookie } from "../auth-legacy";

export async function getUserFromCookies() {
  return _readUserFromCookie();
}
