import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const runtime = "nodejs";

const googleClientId =
  process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
const googleClientSecret =
  process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId) {
  throw new Error("AUTH_GOOGLE_ID (or GOOGLE_CLIENT_ID) is required");
}

if (!googleClientSecret) {
  throw new Error("AUTH_GOOGLE_SECRET (or GOOGLE_CLIENT_SECRET) is required");
}

export const authConfig = {
  basePath: "/api/auth",
  trustHost: true,
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
} satisfies Parameters<typeof NextAuth>[0];

const handler = NextAuth(authConfig);

export { handler as GET, handler as POST };
