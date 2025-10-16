import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const mNA = await import("next-auth");
  const mGP = await import("@auth/core/providers/google");
  const NextAuth = mNA?.default;
  const Google = mGP?.default;
  let callOk = false;
  let callErr: string | null = null;
  try {
    Google?.({ clientId: "x", clientSecret: "y" });
    callOk = true;
  } catch (e: any) {
    callErr = e?.message || String(e);
  }

  return NextResponse.json({
    typeofNextAuth: typeof NextAuth,
    typeofGoogle: typeof Google,
    hasDefaultNA: !!mNA?.default,
    hasDefaultG: !!mGP?.default,
    callOk,
    callErr,
  });
}
