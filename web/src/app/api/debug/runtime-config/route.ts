import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    vercelEnv: process.env.VERCEL_ENV || null,
    databaseUrl: process.env.DATABASE_URL || null,
    directUrl: process.env.DIRECT_URL || null,
    mailProvider: process.env.MAIL_PROVIDER || "none",
    hasSmtp:
      !!process.env.SMTP_HOST &&
      !!process.env.SMTP_USER &&
      !!process.env.SMTP_PASS,
  });
}
