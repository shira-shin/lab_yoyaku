// GET /api/_diag/auth
export const runtime = "nodejs";

export async function GET() {
  const body = {
    hasGoogleId: Boolean(process.env.AUTH_GOOGLE_ID),
    hasGoogleSecret: Boolean(process.env.AUTH_GOOGLE_SECRET),
    authUrl: process.env.AUTH_URL ?? null,
    trustHost: process.env.AUTH_TRUST_HOST ?? null,
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
