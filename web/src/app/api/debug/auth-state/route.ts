import { NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";

const ADMIN_TOKEN = process.env.AUTH_DEBUG_TOKEN;

export async function GET(req: Request) {
  if (!ADMIN_TOKEN) {
    return NextResponse.json(
      { error: "AUTH_DEBUG_TOKEN not set" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      normalizedEmail: true,
      passwordHash: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  const safeUsers = users.map((user) => ({
    ...user,
    passwordHashLength: user.passwordHash ? user.passwordHash.length : 0,
    passwordHash: undefined,
  }));

  return NextResponse.json({
    runtimeEnv: {
      AUTH_BASE_URL: process.env.AUTH_BASE_URL || null,
      APP_URL: process.env.APP_URL || null,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || null,
      VERCEL_URL: process.env.VERCEL_URL || null,
    },
    users: safeUsers,
  });
}
