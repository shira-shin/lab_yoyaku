export async function GET() {
  const gmod = await import("next-auth/providers/google");
  const nextAuth = await import("next-auth");
  return Response.json({
    providerType: typeof gmod.default,      // "function" が正解
    hasNextAuthHandlers: !!nextAuth.default // true が正解（v5）
  });
}