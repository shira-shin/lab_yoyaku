import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

console.log("[auth boot]", {
  nextAuthVersion: (() => {
    try {
      return require("next-auth/package.json").version;
    } catch {
      return "unknown";
    }
  })(),
  googleType: typeof Google,
});

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
});
