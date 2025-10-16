import NextAuth from "next-auth";
import Google from "@auth/core/providers/google";
// Prisma adapterを使う場合のみ↓を有効化（使わないなら削除でOK）
// import { PrismaAdapter } from "@auth/prisma-adapter";
// import { prisma } from "@/lib/prisma"; // あなたのprismaクライアント

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Vercel配下ではtrue推奨
  trustHost: process.env.VERCEL === "1" || process.env.AUTH_TRUST_HOST === "true",

  providers: [
    Google({
      // 既存の環境変数命名に両対応（AUTH_* / GOOGLE_*）
      clientId:
        process.env.AUTH_GOOGLE_ID ??
        process.env.GOOGLE_CLIENT_ID ??
        "",
      clientSecret:
        process.env.AUTH_GOOGLE_SECRET ??
        process.env.GOOGLE_CLIENT_SECRET ??
        "",
    }),
  ],

  // DBに永続化するならアダプタを有効化
  // adapter: PrismaAdapter(prisma),
  // session: { strategy: "database" }, // アダプタ使用時
  // 何も指定しなければJWTセッションで動作
});

// App RouterではGET/POSTを明示エクスポート
export const GET = handlers.GET;
export const POST = handlers.POST;

// PrismaやNode APIsを使うためにEdgeではなくNodeを強制
export const runtime = "nodejs";
