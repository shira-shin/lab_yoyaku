import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
export const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [Google],
  debug: true,
};
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
