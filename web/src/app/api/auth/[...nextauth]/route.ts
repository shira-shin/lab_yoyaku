// App Router: NextAuth v5
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/prisma";

export const dynamic = "force-dynamic"; // キャッシュ回避

const config = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" as const }, // 既存DBセッション運用
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  secret: process.env.AUTH_SECRET,
  trustHost: true,
};

// v5: NextAuth の戻り値から handlers / auth / signIn / signOut を取り出す
export const { handlers, auth, signIn, signOut } = NextAuth(config);

// ルート用に GET/POST を handlers からエクスポート
export const { GET, POST } = handlers;
