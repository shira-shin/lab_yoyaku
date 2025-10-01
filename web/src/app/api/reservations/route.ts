import { NextResponse } from "next/server";
import { z } from "@/lib/zod-helpers";
import { prisma } from "@/src/lib/prisma";
import { normalizeSlugInput } from "@/lib/slug";

const Body = z.object({
  groupSlug: z.string(),
  deviceId: z.string().optional(),
  deviceSlug: z.string().optional(),
  start: z.string(),
  end: z.string(),
  note: z.string().optional(),
});

function parseFlexibleDate(input: string): Date {
  const trimmed = (input ?? "").trim();
  if (!trimmed) {
    throw new Error("Invalid datetime");
  }
  const replaced = trimmed.replace(/\//g, "-");
  const spaced = replaced.replace(/\s+/g, " ");
  const withTime = /^\d{4}-\d{2}-\d{2}$/.test(spaced)
    ? `${spaced}T00:00:00`
    : /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(spaced)
    ? spaced.replace(" ", "T") + ":00"
    : spaced.includes("T")
    ? spaced
    : spaced.replace(" ", "T");
  const date = new Date(withTime);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid datetime");
  }
  return date;
}

function toIso(input: string): string {
  return parseFlexibleDate(input).toISOString();
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const body = Body.parse(raw);

    const groupSlug = normalizeSlugInput(body.groupSlug ?? "");
    const group = await prisma.group.findUnique({
      where: { slug: groupSlug },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json({ message: "group not found" }, { status: 404 });
    }

    let deviceId = body.deviceId ?? null;
    if (!deviceId && body.deviceSlug) {
      const device = await prisma.device.findFirst({
        where: { slug: body.deviceSlug, groupId: group.id },
        select: { id: true },
      });
      if (!device) {
        return NextResponse.json({ message: "device not found" }, { status: 404 });
      }
      deviceId = device.id;
    }

    if (!deviceId) {
      return NextResponse.json(
        { message: "deviceId or deviceSlug required" },
        { status: 400 },
      );
    }

    const startIso = toIso(body.start);
    const endIso = toIso(body.end);

    const created = await prisma.reservation.create({
      data: {
        groupId: group.id,
        deviceId,
        start: new Date(startIso),
        end: new Date(endIso),
        note: body.note ?? "",
      },
      select: { id: true },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    const message =
      error?.message ?? error?.cause?.message ?? "failed to create reservation";
    return NextResponse.json({ message }, { status: 400 });
  }
}
