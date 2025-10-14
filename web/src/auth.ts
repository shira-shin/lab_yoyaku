import NextAuth from "next-auth";
// v5 では @auth/core 直 import を推奨
import * as GoogleMod from "@auth/core/providers/google";

/** どの形で来ても関数を返す正規化（default / named / module本体） */
function asProvider<T extends Function>(mod: any): T {
  if (typeof mod === "function") return mod as T;
  if (typeof mod?.default === "function") return mod.default as T;
  // まれに named export になる環境がある
  for (const k of ["Google", "default"]) {
    if (typeof mod?.[k] === "function") return mod[k] as T;
  }
  throw new Error("Google provider is not a function");
}

const Google = asProvider<typeof import("@auth/core/providers/google").default>(GoogleMod);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
});
