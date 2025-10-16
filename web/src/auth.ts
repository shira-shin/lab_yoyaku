import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const nextAuth = NextAuth({
  providers: [
    Google({
      clientId:
        process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret:
        process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
});

export const { auth, signIn, signOut } = nextAuth;

export const GET = nextAuth.handlers.GET;
export const POST = nextAuth.handlers.POST;
