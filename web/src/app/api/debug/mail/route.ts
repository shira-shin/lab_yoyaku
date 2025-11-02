import { NextResponse } from "next/server";

import { auth, normalizeEmail } from "@/lib/auth-legacy";
import { sendAppMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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

export async function POST(req: Request) {
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
    const body = await req.json().catch(() => ({}));
    const to = body.to || viewer.email || process.env.SMTP_USER;

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
