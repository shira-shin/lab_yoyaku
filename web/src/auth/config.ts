import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

const isProd = process.env.NODE_ENV === "production";

export const authOptions: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.APP_AUTH_SECRET,
  trustHost: true,
  debug: !isProd,
};

export const authConfig = authOptions;
