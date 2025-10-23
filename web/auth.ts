import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// v5 では providers に呼び出した結果を渡すことで、ランタイム最適化による不整合を防ぐ
export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  // 既存のVercel変数名に合わせる
  providers: [
    Google({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    }),
  ],
  // 秘密鍵は v5 なら AUTH_SECRET を推奨。無ければ APP_AUTH_SECRET をフォールバック
  secret: process.env.AUTH_SECRET ?? process.env.APP_AUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
export { authConfig };
