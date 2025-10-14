import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

console.log("[AUTH_WIREUP]", { file: __filename, na: typeof NextAuth, gp: typeof Google });

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
});
