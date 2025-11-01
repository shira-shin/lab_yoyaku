import { NextResponse } from "next/server";

import { getSmtpConfig, isSmtpUsable } from "@/lib/mailer";

export const runtime = "nodejs";

export async function GET() {
  const cfg = getSmtpConfig();
  return NextResponse.json({
    mailProvider: cfg.provider,
    smtpUsable: isSmtpUsable(),
    host: cfg.host ? true : false,
    user: cfg.user ? true : false,
    pass: cfg.pass ? true : false,
    mailFrom: cfg.from,
  });
}
