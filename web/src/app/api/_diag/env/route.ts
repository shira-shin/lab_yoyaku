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
  const appUrl = summarizeUrl(process.env.APP_URL);
  const publicAppUrl = summarizeUrl(process.env.NEXT_PUBLIC_APP_URL);
  const legacyAppBaseUrl = summarizeUrl(process.env.APP_BASE_URL);

  return NextResponse.json({
    APP_URL: appUrl,
    NEXT_PUBLIC_APP_URL: publicAppUrl,
    APP_BASE_URL: legacyAppBaseUrl,
    RESOLVED_APP_BASE_URL: summarizeUrl(appBaseUrl),
    DATABASE_URL: summarizeDatabaseUrl(process.env.DATABASE_URL),
    RUN_MIGRATIONS: process.env.RUN_MIGRATIONS ?? null,
    APP_SESSION_COOKIE_NAME: process.env.APP_SESSION_COOKIE_NAME ?? "lab_session",
    MAIL_WEBHOOK: mask(process.env.MAIL_WEBHOOK),
    NODE_ENV: process.env.NODE_ENV ?? null,
    VERCEL: process.env.VERCEL ?? null,
  });
}
