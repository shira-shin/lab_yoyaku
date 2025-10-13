import NextAuth from "next-auth";
import Google from "@auth/core/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

// single Prisma client (hot-reload safe)
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}
const prisma = global.__prisma ?? new PrismaClient();
if (!global.__prisma) global.__prisma = prisma;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // ✅ v5 は Provider "関数"をそのまま渡す（呼び出さない）
  providers: [Google],
  // Vercel 配下では必須
  trustHost: true,
});
