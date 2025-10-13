import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

declare global { var __prisma: PrismaClient | undefined }
const prisma = global.__prisma ?? new PrismaClient();
if (!global.__prisma) global.__prisma = prisma;

// ここで “必ず” 関数を実行して「プロバイダオブジェクト」にしてから配列へ入れる
const googleProvider = Google({
  clientId: process.env.AUTH_GOOGLE_ID!,
  clientSecret: process.env.AUTH_GOOGLE_SECRET!,
});

// ★ 形チェック（Vercel の Functions ログに出ます）
console.log("[auth] typeof Google import =", typeof Google); // 期待: "function"
console.log("[auth] googleProvider keys =", Object.keys(googleProvider)); // 期待: ["id", "name", "type", ...]
console.log("[auth] env present =", !!process.env.AUTH_GOOGLE_ID, !!process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [googleProvider], // ← “関数”ではなく“実体”を渡す
  trustHost: true,
});
