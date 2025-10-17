import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

const config: NextAuthConfig = {
  trustHost: true,
  secret: process.env.APP_AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    }),
  ],
};

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(config);

export const runtime = "nodejs";
