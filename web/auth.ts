import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// 重要: v5 は providers に「関数そのもの」を渡す。Google を“呼ばない”
export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [Google],
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
