import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID!,
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  secret:
    process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || process.env.JWT_SECRET,
};

export default NextAuth(authOptions);
