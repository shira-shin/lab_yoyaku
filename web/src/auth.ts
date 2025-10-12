import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/prisma";

// NextAuth v5: ここで全てを定義して export
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google], // ← 関数を呼ばずにそのまま渡す形で安定
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" as const },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
});
