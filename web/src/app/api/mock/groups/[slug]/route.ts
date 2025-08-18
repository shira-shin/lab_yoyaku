import { NextResponse } from "next/server";
import {
  getGroupByNameOrSlug,
  publicizeGroup,
  devices,
} from "@/lib/mock-db";

export async function GET(
  _req: Request,
  { params: { slug } }: { params: { slug: string } }
) {
  const g = getGroupByNameOrSlug(slug);
  if (!g) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  return NextResponse.json({
    group: publicizeGroup(g),
    devices: devices.filter((d) => d.groupId === g.id),
  });
}
