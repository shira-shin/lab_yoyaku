import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const DEBUG_TOKEN = process.env.AUTH_DEBUG_TOKEN;

type RequestBody = {
  token?: string;
  email?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as RequestBody;
  const { token, email } = body;

  if (!DEBUG_TOKEN || token !== DEBUG_TOKEN) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!email) {
    return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: { normalizedEmail },
    select: {
      id: true,
      email: true,
      normalizedEmail: true,
      passwordHash: true,
    },
  });

  return NextResponse.json({ ok: true, user });
}
