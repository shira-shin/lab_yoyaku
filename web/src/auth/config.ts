import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// 実行時に providers 構築で例外が出ていないかを最小限ログ
console.log("[auth] boot providers", {
  hasId: !!process.env.GOOGLE_OAUTH_CLIENT_ID,
  hasSecret: !!process.env.GOOGLE_OAUTH_CLIENT_SECRET,
});

export const authConfig: NextAuthConfig = {
  // v5 は provider を「関数呼び出し」で渡す（new ではない）
  providers: [
    Google({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  // v5 の基本オプション
  secret: process.env.APP_AUTH_SECRET,
  trustHost: true, // AUTH_TRUST_HOST=true も入れているが念のため
  // 必要最低限にとどめる。callbacks/pages などは一旦消す。
};
