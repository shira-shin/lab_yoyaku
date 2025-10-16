import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID!;
const GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET!;

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    }),
  ],
};

export default NextAuth(authOptions);
