import { NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";

const DEBUG_TOKEN = process.env.AUTH_DEBUG_TOKEN;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const token = searchParams.get("token");

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

  return NextResponse.json({ ok: true, user }, { status: 200 });
}
