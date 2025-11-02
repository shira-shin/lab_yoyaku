export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { auth, normalizeEmail } from "@/lib/auth-legacy";
import { getMailerConfig, isSmtpConfigured, sendMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

function normalize(value: string | null | undefined) {
  return value ? normalizeEmail(value) : null;
}

async function isAdminUser(userId: string, email: string | null | undefined) {
  const membership = await prisma.groupMember.findFirst({
    where: { userId, role: { in: ["OWNER", "ADMIN"] } },
    select: { id: true },
  });
  if (membership) return true;

  const normalizedViewer = normalize(email);
  const smtpUser = normalize(process.env.SMTP_USER ?? null);
  return Boolean(normalizedViewer && smtpUser && normalizedViewer === smtpUser);
}

export async function POST() {
  const session = await auth();
  const viewer = session?.user;

  if (!viewer?.email || !viewer.id) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const allowed = await isAdminUser(viewer.id, viewer.email);
  if (!allowed) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  try {
    await sendMail(
      viewer.email,
      "Lab Yoyaku SMTP テストメール",
      `<p>このメールが届けば、SMTP 設定は動作しています。</p>`,
      "このメールが届けば、SMTP 設定は動作しています。",
    );

    console.info("[debug/send-test-mail] sent", { to: viewer.email });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const cfg = getMailerConfig();
    const configured = isSmtpConfigured();

    if (!configured) {
      console.warn("[debug/send-test-mail] smtp missing config", cfg);
      return NextResponse.json(
        {
          ok: false,
          reason: "smtp-not-configured" as const,
          smtp: cfg,
        },
        { status: 200 },
      );
    }

    console.error("[debug/send-test-mail] send error", error?.message || error);
    return NextResponse.json(
      {
        ok: false,
        reason: "smtp-failed" as const,
        smtp: cfg,
        error: error?.message || String(error),
      },
      { status: 200 },
    );
  }
}
