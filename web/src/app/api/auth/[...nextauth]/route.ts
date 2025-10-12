import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const authConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" as const },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
    }),
  ],
  secret: process.env.AUTH_SECRET,
  trustHost: true,
};

const {
  handlers: { GET, POST },
} = NextAuth(authConfig);
export { GET, POST };
