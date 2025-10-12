import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/prisma";

export const dynamic = "force-dynamic"; // キャッシュ回避
export const runtime = "nodejs";        // どちらでも可: "nodejs" | "edge"

const config = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" as const },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  secret: process.env.AUTH_SECRET,
  trustHost: true,
};

// v5: ここで handlers から GET/POST だけを取り出して export（handlers自体はexportしない）
const { handlers: { GET, POST } } = NextAuth(config);
export { GET, POST };
