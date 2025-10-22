import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { baseAuthConfig } from "./auth";

/**
 * ✅ こちらでのみプロバイダを「呼び出す」。
 *    このファイルは静的チェック対象外にしておくと安全です。
 */
const providers = [
  Google({
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    allowDangerousEmailAccountLinking: false,
  }),
];

const authConfig: NextAuthConfig = {
  ...baseAuthConfig,
  providers,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
