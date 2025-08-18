import { NextResponse } from "next/server";
import { groups } from "@/lib/mock-db";
export async function GET() { return NextResponse.json({ groups }); }
