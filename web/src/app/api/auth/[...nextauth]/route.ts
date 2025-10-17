import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const runtime = "nodejs";

const authConfig = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
});

export const {
  handlers: { GET, POST },
} = authConfig;
