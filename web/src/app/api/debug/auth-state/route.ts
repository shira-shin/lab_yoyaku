import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEBUG_TOKEN = process.env.AUTH_DEBUG_TOKEN;

export async function GET(req: Request) {
  if (!DEBUG_TOKEN) {
    return NextResponse.json(
      { ok: false, error: "AUTH_DEBUG_TOKEN is not set" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (token !== DEBUG_TOKEN) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      normalizedEmail: true,
      passwordHash: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  return NextResponse.json({
    ok: true,
    count: users.length,
    users,
  });
}
