import { NextResponse } from "next/server";

const mask = (value?: string) => (value ? `${value.length}chars` : null);

export async function GET() {
  return NextResponse.json({
    AUTH_GOOGLE_ID: Boolean(process.env.AUTH_GOOGLE_ID),
    AUTH_GOOGLE_SECRET: Boolean(process.env.AUTH_GOOGLE_SECRET),
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
    NEXTAUTH_URL: mask(process.env.NEXTAUTH_URL),
  });
}
