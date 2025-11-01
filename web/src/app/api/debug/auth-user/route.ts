import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEBUG_TOKEN = process.env.AUTH_DEBUG_TOKEN || process.env.DEBUG_TOKEN;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { token, email } = body as { token?: string; email?: string };

  if (!DEBUG_TOKEN || token !== DEBUG_TOKEN) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!email) {
    return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { normalizedEmail: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      normalizedEmail: true,
      passwordHash: true,
    },
  });

  return NextResponse.json({ ok: true, user });
}
