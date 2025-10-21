// v5: providers は「呼ばない」= Google({ ... }) としない
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [Google],
  trustHost: true,
  debug: process.env.NODE_ENV !== "production",
  // 秘密鍵があるならどちらかに合わせる（存在する方にそろえる）
  secret: process.env.APP_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
});
