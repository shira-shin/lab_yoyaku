import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
// もし Prisma Adapter を使うなら：
// import { PrismaAdapter } from "@auth/prisma-adapter";
// import { prisma } from "@/server/db/prisma";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  // v5: ここは「呼ばない」→ [Google]
  providers: [Google],
  // adapter: PrismaAdapter(prisma), // 使う場合はアンコメント
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
// 追加の export は不要（重複 export を作らない）
