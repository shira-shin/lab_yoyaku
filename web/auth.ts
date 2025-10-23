import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

const googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
  throw new Error(
    "Missing Google OAuth credentials: set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.",
  );
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
