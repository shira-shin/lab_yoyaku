import NextAuth from "next-auth";
import Google from "@auth/core/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

// single Prisma client (hot-reload 対策)
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}
const prisma = global.__prisma ?? new PrismaClient();
if (!global.__prisma) global.__prisma = prisma;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // ★ ここがポイント：呼び出さずに関数を渡す（環境変数 AUTH_GOOGLE_ID/SECRET を内部で読む）
  providers: [Google],
  // Vercel プロキシ下では必須
  trustHost: true,
});
