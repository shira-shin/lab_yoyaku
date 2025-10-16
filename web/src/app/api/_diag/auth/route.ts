export const runtime = "nodejs";

export async function GET() {
  const body = {
    vercel: process.env.VERCEL === "1",
    vercelUrl: process.env.VERCEL_URL,
    authUrl:
      process.env.AUTH_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null),
    trustHostEnv: process.env.AUTH_TRUST_HOST,
    trustHostEffective:
      process.env.VERCEL === "1" || process.env.AUTH_TRUST_HOST === "true",
    hasGoogleId: !!process.env.AUTH_GOOGLE_ID,
    hasGoogleSecret: !!process.env.AUTH_GOOGLE_SECRET,
    hasSecret: !!process.env.AUTH_SECRET,
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
