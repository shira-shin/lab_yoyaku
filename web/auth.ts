import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

// Prisma は Node ランタイムで使用（Edge では使わない）
const prisma = new PrismaClient();

/**
 * ✅ 静的チェックを通すため、ここではプロバイダを呼び出さず
 *    シンボル（Google）だけをエクスポートします。
 */
export const providerSymbols = [Google];

/**
 * ✅ ランタイムに依存しないベース設定。
 *    ※ providers 配列はここに入れない。
 */
export const baseAuthConfig: Partial<NextAuthConfig> = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  // secret は ENV AUTH_SECRET を利用（VERCEL 側に設定）
};
