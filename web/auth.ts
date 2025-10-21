import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const isDebugEnabled = process.env.NODE_ENV !== "production";
const shouldTrustHost =
  process.env.AUTH_TRUST_HOST === "true" ||
  process.env.AUTH_TRUST_HOST === "1" ||
  process.env.NODE_ENV !== "production";

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [Google],
  secret: process.env.AUTH_SECRET,
  trustHost: shouldTrustHost,
  debug: isDebugEnabled,
});
