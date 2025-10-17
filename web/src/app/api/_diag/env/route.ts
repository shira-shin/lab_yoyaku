import { NextResponse } from "next/server";

type Masked = string | null;

type UrlSummary =
  | { present: false }
  | { present: true; summary: string }
  | { present: true; error: string };

type DatabaseSummary =
  | { present: false }
  | { present: true; protocol: string; host: string; port: string | null; database: string | null }
  | { present: true; error: string };

const mask = (value?: string | null): Masked => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 4) return `${"*".repeat(trimmed.length)} (${trimmed.length} chars)`;
  return `${trimmed.slice(0, 2)}…${trimmed.slice(-2)} (${trimmed.length} chars)`;
};

const summarizeUrl = (value?: string | null): UrlSummary => {
  if (!value) return { present: false };
  try {
    const url = new URL(value);
    const pathname = url.pathname === "/" ? "" : url.pathname;
    return {
      present: true,
      summary: `${url.protocol}//${url.host}${pathname}`,
    };
  } catch (error) {
    return { present: true, error: `invalid URL: ${(error as Error).message}` };
  }
};

const summarizeDatabaseUrl = (value?: string | null): DatabaseSummary => {
  if (!value) return { present: false };
  try {
    const url = new URL(value);
    return {
      present: true,
      protocol: url.protocol.replace(/:$/, ""),
      host: url.hostname,
      port: url.port || null,
      database: url.pathname ? url.pathname.replace(/^\//, "") || null : null,
    };
  } catch (error) {
    return { present: true, error: `invalid URL: ${(error as Error).message}` };
  }
};

export async function GET() {
  const appBaseUrl = summarizeUrl(process.env.APP_BASE_URL);
  const nextAuthUrl = summarizeUrl(process.env.NEXTAUTH_URL);

  return NextResponse.json({
    GOOGLE_OAUTH_CLIENT_ID: mask(process.env.GOOGLE_OAUTH_CLIENT_ID),
    GOOGLE_OAUTH_CLIENT_SECRET: mask(process.env.GOOGLE_OAUTH_CLIENT_SECRET),
    APP_AUTH_SECRET: mask(process.env.APP_AUTH_SECRET),
    APP_BASE_URL: appBaseUrl,
    NEXTAUTH_URL: nextAuthUrl,
    APP_BASE_URL_MATCHES_NEXTAUTH_URL:
      appBaseUrl.present && nextAuthUrl.present && "summary" in appBaseUrl && "summary" in nextAuthUrl
        ? appBaseUrl.summary === nextAuthUrl.summary
        : null,
    DATABASE_URL: summarizeDatabaseUrl(process.env.DATABASE_URL),
    NODE_ENV: process.env.NODE_ENV ?? null,
    VERCEL: process.env.VERCEL ?? null,
  });
}
