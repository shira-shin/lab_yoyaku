import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const DEBUG_TOKEN = process.env.AUTH_DEBUG_TOKEN;

type DebugResponse =
  | { ok: false; error: string }
  | {
      ok: true;
      user: null | {
        id: string;
        email: string | null;
        normalizedEmail: string | null;
        passwordHash: string | null;
        passwordHashPreview: string | null;
        passwordHashLength: number;
      };
    };

export async function GET(req: Request) {
  if (!DEBUG_TOKEN) {
    return NextResponse.json<DebugResponse>(
      { ok: false, error: "AUTH_DEBUG_TOKEN not set" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (token !== DEBUG_TOKEN) {
    return NextResponse.json<DebugResponse>(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  const email = url.searchParams.get("email");
  const id = url.searchParams.get("id");

  if (!email && !id) {
    return NextResponse.json<DebugResponse>(
      { ok: false, error: "email or id is required" },
      { status: 400 }
    );
  }

  const where = email
    ? { normalizedEmail: email.toLowerCase() }
    : { id: id! };

  const user = await prisma.user.findFirst({
    where,
    select: {
      id: true,
      email: true,
      normalizedEmail: true,
      passwordHash: true,
    },
  });

  return NextResponse.json<DebugResponse>({
    ok: true,
    user: user
      ? {
          ...user,
          passwordHashPreview: user.passwordHash
            ? user.passwordHash.slice(0, 15) + "..."
            : null,
          passwordHashLength: user.passwordHash ? user.passwordHash.length : 0,
        }
      : null,
  });
}
