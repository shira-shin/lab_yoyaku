// App Router + NextAuth v5 minimal handler (Node.js runtime is default; do NOT export runtime)
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { GET, POST, auth, signIn, signOut } = NextAuth({
  // v5: 明示的に clientId/clientSecret を指定（AUTH_* でも GOOGLE_* でもOK）
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  // v5: trustHost を true（Vercel でのコールバックURL検証を安定させる）
  trustHost: true,
  // 秘密鍵（v5 は AUTH_SECRET。NEXTAUTH_SECRET を同値で入れていてもOK）
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
});
