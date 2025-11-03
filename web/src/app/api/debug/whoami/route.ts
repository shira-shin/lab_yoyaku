import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const host = req.headers.get("host");
  const using = (process.env.DIRECT_URL || process.env.DATABASE_URL || "").split("@").pop();

  return NextResponse.json({
    host,
    origin: url.origin,
    db: using,
  });
}
