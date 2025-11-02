import { NextResponse } from "next/server";

import { getSmtpConfig, isSmtpConfigured } from "@/lib/mailer";

export const runtime = "nodejs";

export async function GET() {
  const cfg = getSmtpConfig();
  return NextResponse.json({
    smtpConfigured: isSmtpConfigured(),
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    hasUser: Boolean(cfg.user),
    hasPass: Boolean(cfg.pass),
    hasFrom: Boolean(cfg.from),
    mailFrom: cfg.from,
  });
}
