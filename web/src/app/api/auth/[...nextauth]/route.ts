import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const runtime = "nodejs";

const auth = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  secret: process.env.AUTH_SECRET,
  trustHost: true,
});

export const { GET, POST } = auth;
