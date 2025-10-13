export async function GET() {
  const gmod = await import("next-auth/providers/google");
  const nextAuth = await import("next-auth");
  return Response.json({
    providerType: typeof gmod.default,      // ← "function" ならOK
    hasNextAuthHandlers: !!nextAuth.default // true ならOK
  });
}
