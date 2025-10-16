import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { auth, GET, POST } = NextAuth({
  providers: [
    Google,
  ],
  trustHost: true,
});
