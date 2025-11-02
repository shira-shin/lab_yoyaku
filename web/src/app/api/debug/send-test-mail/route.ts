export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { auth, normalizeEmail } from "@/lib/auth-legacy";
import { getSmtpConfig, sendMail } from "@/lib/mailer";
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

  const result = await sendMail({
    to: viewer.email,
    subject: "Lab Yoyaku SMTP テストメール",
    text: `このメールが届けば、SMTP 設定は動作しています。`,
    html: `<p>このメールが届けば、SMTP 設定は動作しています。</p>`,
  });

  if (result.ok) {
    console.info("[debug/send-test-mail] sent", { to: viewer.email });
    return NextResponse.json({ ok: true });
  }

  const cfg = getSmtpConfig();
  const reason = result.reason === "missing-config" ? "smtp-not-configured" : "smtp-failed";

  if (result.reason === "missing-config") {
    console.warn("[debug/send-test-mail] smtp missing config", {
      hasHost: !!cfg.host,
      hasPort: !!cfg.port,
      secure: cfg.secure,
      hasUser: !!cfg.user,
      hasPass: !!cfg.pass,
      hasFrom: !!cfg.from,
    });
  } else {
    console.error("[debug/send-test-mail] send error", result.error);
  }

  return NextResponse.json(
    {
      ok: false,
      reason,
      smtp: {
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        hasUser: !!cfg.user,
        hasPass: !!cfg.pass,
        hasFrom: !!cfg.from,
      },
    },
    { status: 200 },
  );
}
