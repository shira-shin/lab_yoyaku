export async function GET() {
  const body = {
    vercel: process.env.VERCEL === "1",
    vercelUrl: process.env.VERCEL_URL,
    appBaseUrl:
      process.env.APP_BASE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null),
    nextAuthUrl: process.env.NEXTAUTH_URL,
    trustHost: true,
    hasGoogleId: !!process.env.GOOGLE_OAUTH_CLIENT_ID,
    hasGoogleSecret: !!process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    hasSecret: !!process.env.APP_AUTH_SECRET,
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
