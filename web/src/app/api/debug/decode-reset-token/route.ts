import { NextResponse } from "next/server";
import { verifyResetToken } from "@/lib/reset-token";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const v = verifyResetToken(token);
  return NextResponse.json(v);
}
