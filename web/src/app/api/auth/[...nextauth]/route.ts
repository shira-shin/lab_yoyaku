import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const runtime = "nodejs"; // do NOT use 'edge'

const config: NextAuthConfig = {
  trustHost: true,
  secret: process.env.APP_AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    }),
  ],
  // temporary logs to verify what is being imported at runtime
  events: {
    signIn: async () => console.log("[auth] signIn event"),
  },
};

// Debug: prove the provider is a function and invocation returns an object
console.log("[auth] typeof Google =", typeof Google);
try {
  const probe = Google({ clientId: "x", clientSecret: "y" } as any);
  console.log("[auth] typeof Google(...) =", typeof probe);
} catch (e) {
  console.log("[auth] probe threw as expected (using dummy creds)");
}

const { handlers } = NextAuth(config);
export const GET = handlers.GET;
export const POST = handlers.POST;
