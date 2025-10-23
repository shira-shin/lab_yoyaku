import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  providers: [Google],
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
