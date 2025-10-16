import { NextResponse } from "next/server";
export const GET = () => NextResponse.json({ handler: "app-v5" });
export const runtime = "nodejs";
