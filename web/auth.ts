import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
// v5 は provider を「呼ばない」→ 配列にシンボルをそのまま入れる

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [Google], // ← 絶対に Google() としない
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
