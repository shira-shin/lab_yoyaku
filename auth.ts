import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

const isDebugEnabled = process.env.NODE_ENV !== "production";
const shouldTrustHost =
  process.env.AUTH_TRUST_HOST === "true" ||
  process.env.AUTH_TRUST_HOST === "1" ||
  process.env.NODE_ENV !== "production";

export const authConfig: NextAuthConfig = {
  providers: [Google],
  secret: process.env.AUTH_SECRET,
  trustHost: shouldTrustHost,
  debug: isDebugEnabled,
};

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);
