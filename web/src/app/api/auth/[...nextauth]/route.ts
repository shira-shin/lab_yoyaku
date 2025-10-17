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

const {
  handlers: { GET, POST },
} = NextAuth(config);

export { GET, POST };
export const runtime = "nodejs";
