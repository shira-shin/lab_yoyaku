// web/src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authConfig } from "@/auth/config";

// v5 の正しいエクスポート：handlers から GET/POST を取り出す
const { handlers } = NextAuth(authConfig);
export const { GET, POST } = handlers;

// Vercel/Edge との相性を避けるなら Node.js 実行に固定
export const runtime = "nodejs";
// ビルド時の静的最適化を避け、毎回サーバ実行させる（キャッシュ絡みの不具合回避）
export const dynamic = "force-dynamic";
