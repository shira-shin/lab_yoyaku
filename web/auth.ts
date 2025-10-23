import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// v5 では providers に呼び出した結果を渡すことで、ランタイム最適化による不整合を防ぐ
export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
export { authConfig };
