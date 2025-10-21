import { headers } from "next/headers";

const fallbackFromVercel = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;

const envBaseUrl = process.env.APP_BASE_URL ?? fallbackFromVercel;

const normalize = (value: string) => value.replace(/\/$/, "");

export const appBaseUrl = normalize(envBaseUrl ?? "http://localhost:3000");

export function getBaseUrl() {
  if (envBaseUrl) {
    return normalize(envBaseUrl);
  }

  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }

  return appBaseUrl;
}
