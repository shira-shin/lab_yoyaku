import NextAuth from "next-auth";
import * as GoogleMod from "next-auth/providers/google";

// --- BEGIN harden Google provider import ---
const Google =
  // most builds: default export is the function
  (GoogleMod as any).default ??
  // some interop/bundler cases: module itself is callable
  (typeof (GoogleMod as any) === "function" ? (GoogleMod as any) : undefined);

if (typeof Google !== "function") {
  // show exactly what we imported to the log to avoid opaque minified errors
  console.error("[auth] Google provider import failed", {
    keys: Object.keys(GoogleMod as any),
    typeofModule: typeof (GoogleMod as any),
    typeofDefault: typeof (GoogleMod as any)?.default,
    resolved: (() => {
      try {
        return require.resolve("next-auth/providers/google");
      } catch {
        return "unresolved";
      }
    })(),
  });
  throw new Error(
    "[auth] Google provider is not a function. Check import/bundler duplication."
  );
}
// --- END harden Google provider import ---

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
