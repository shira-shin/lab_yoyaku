export const runtime = "nodejs";

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const auth = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  trustHost: true,
  debug: true,
});

export const { GET, POST } = auth.handlers;
