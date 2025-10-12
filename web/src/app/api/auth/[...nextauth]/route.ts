import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      // allowDangerousEmailAccountLinking: true,
    }),
  ],
  // session: { strategy: "database" },
  // debug: process.env.NODE_ENV !== "production",
});

export const { GET, POST } = handlers;
