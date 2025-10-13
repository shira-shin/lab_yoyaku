import NextAuth from "next-auth";
import Google from "@auth/core/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

// single prisma client
declare global { var __prisma: PrismaClient | undefined }
const prisma = global.__prisma ?? new PrismaClient();
if (!global.__prisma) global.__prisma = prisma;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],  // ← ここ！ Google() と「呼ばない」
  trustHost: true,
  // debug: true, // 追加してOK（サーバーログに詳細が出ます）
});
