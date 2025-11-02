import { NextResponse } from "next/server";

import { getMailerConfig, isSmtpConfigured } from "@/lib/mailer";

export const runtime = "nodejs";

export async function GET() {
  const cfg = getMailerConfig();
  return NextResponse.json({
    smtpConfigured: isSmtpConfigured(),
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    user: cfg.user,
    hasPass: cfg.hasPass,
    from: cfg.from,
  });
}
