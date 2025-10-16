import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// NOTE: App Router はデフォルトで Node.js 実行。runtime の export は不要＆出さない。
export const { GET, POST, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId:
        process.env.AUTH_GOOGLE_ID ??
        process.env.GOOGLE_CLIENT_ID ??
        "",
      clientSecret:
        process.env.AUTH_GOOGLE_SECRET ??
        process.env.GOOGLE_CLIENT_SECRET ??
        "",
    }),
  ],
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
});
