import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/prisma";

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  /**
   * v5 ではプロバイダを直接配列に渡す（関数呼び出しは禁止）。
   */
  providers: [Google],
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
