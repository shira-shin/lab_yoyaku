import { NextResponse } from "next/server";

import { sendMail } from "@/lib/mailer";

export const runtime = "nodejs";

export async function GET() {
  try {
    await sendMail(
      process.env.SMTP_USER || "raspaimie968@gmail.com",
      "SMTP debug",
      "SMTP OK",
    );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[debug/smtp] ERROR", e?.message || e);
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 },
    );
  }
}
