import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies";

const COOKIE_NAMES = [
  SESSION_COOKIE_NAME,
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export async function POST() {
  try {
    const jar = cookies();
    for (const name of COOKIE_NAMES) {
      if (!name) continue;
      jar.set(name, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        expires: new Date(0),
      });
    }
  } catch (error) {
    console.warn("[cookies/delete] failed to clear cookies", error);
  }

  return NextResponse.json({ ok: true });
}
