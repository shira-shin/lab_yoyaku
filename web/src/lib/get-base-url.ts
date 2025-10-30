const FALLBACK_PRODUCTION = "https://labyoyaku.vercel.app";

export function getBaseUrl() {
  if (process.env.AUTH_BASE_URL) return process.env.AUTH_BASE_URL;
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return FALLBACK_PRODUCTION;
}
