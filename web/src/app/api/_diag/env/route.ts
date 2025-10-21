import { NextResponse } from "next/server";

import { appBaseUrl } from "@/lib/http/base-url";

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
  const configuredAppBaseUrl = summarizeUrl(process.env.APP_BASE_URL);
  const nextAuthUrl = summarizeUrl(process.env.NEXTAUTH_URL);

  const trustHostEffective =
    process.env.AUTH_TRUST_HOST === "true" ||
    process.env.AUTH_TRUST_HOST === "1" ||
    process.env.NODE_ENV !== "production";

  return NextResponse.json({
    AUTH_GOOGLE_ID: mask(process.env.AUTH_GOOGLE_ID),
    AUTH_GOOGLE_SECRET: mask(process.env.AUTH_GOOGLE_SECRET),
    AUTH_SECRET: mask(process.env.AUTH_SECRET),
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? null,
    AUTH_TRUST_HOST_EFFECTIVE: trustHostEffective,
    APP_BASE_URL: configuredAppBaseUrl,
    RESOLVED_APP_BASE_URL: summarizeUrl(appBaseUrl),
    NEXTAUTH_URL: nextAuthUrl,
    APP_BASE_URL_MATCHES_NEXTAUTH_URL:
      configuredAppBaseUrl.present && nextAuthUrl.present &&
      "summary" in configuredAppBaseUrl && "summary" in nextAuthUrl
        ? configuredAppBaseUrl.summary === nextAuthUrl.summary
        : null,
    DATABASE_URL: summarizeDatabaseUrl(process.env.DATABASE_URL),
    NODE_ENV: process.env.NODE_ENV ?? null,
    VERCEL: process.env.VERCEL ?? null,
  });
}
