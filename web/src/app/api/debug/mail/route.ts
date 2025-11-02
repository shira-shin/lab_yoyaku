import { NextResponse } from "next/server";

import { sendAppMail } from "@/lib/mailer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const to = body.to || process.env.SMTP_USER;

    if (!to) {
      return NextResponse.json(
        { ok: false, error: "SMTP_USER_NOT_CONFIGURED" },
        { status: 400 },
      );
    }

    await sendAppMail({
      to,
      subject: "SMTP debug",
      text: "This is a debug mail from lab_yoyaku.",
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[debug/mail] error", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
