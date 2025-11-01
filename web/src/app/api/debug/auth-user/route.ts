import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEBUG_TOKEN = process.env.AUTH_DEBUG_TOKEN || "shira-debug-2025";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  const email = (searchParams.get("email") || "").trim().toLowerCase();

  if (!token || token !== DEBUG_TOKEN) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!email) {
    return NextResponse.json({ ok: false, error: "email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { normalizedEmail: email },
    select: { id: true, email: true, normalizedEmail: true, passwordHash: true },
  });

  return NextResponse.json({ ok: true, user });
}
