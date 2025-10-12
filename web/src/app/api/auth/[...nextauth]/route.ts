import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" as const },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
});

export const { GET, POST } = handlers;
export { auth, signIn, signOut };
