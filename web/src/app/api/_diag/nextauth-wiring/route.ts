import { NextResponse } from "next/server";


export async function GET() {
  const mNA = await import("next-auth");
  const NextAuth = mNA?.default;

  return NextResponse.json({
    typeofNextAuth: typeof NextAuth,
    hasDefaultNA: !!mNA?.default,
    typeofGoogle: "not-checked",
    hasDefaultG: false,
    callOk: "not-checked",
    callErr: null,
  });
}
