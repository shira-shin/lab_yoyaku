import { NextResponse } from "next/server";
import { sendMail } from "@/lib/mailer";
import { createResetToken } from "@/lib/reset-token";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://labyoyaku.vercel.app";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ ok: false, error: "EMAIL_REQUIRED" }, { status: 400 });
    }

    const token = createResetToken(email /*, 1800 */);
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;

    console.log("[forgot-password] will send mail", { email, resetUrl });

    await sendMail(
      email,
      "Password reset",
      `<p>下のリンクからパスワードを再設定してください（30分有効）:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[forgot-password] mail send failed", err);
    return new NextResponse(
      JSON.stringify({
        ok: false,
        error: "MAIL_SEND_FAILED",
        detail: (err as any)?.message ?? String(err),
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
}
