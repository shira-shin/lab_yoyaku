import NextAuth, { type NextAuthConfig } from "next-auth";
import GoogleImport from "next-auth/providers/google";

const Google = (GoogleImport as any)?.default ?? (GoogleImport as any);
export const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [Google],
  debug: true,
};
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
