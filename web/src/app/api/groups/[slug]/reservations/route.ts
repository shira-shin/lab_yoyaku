import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { normalizeSlugInput } from "@/lib/slug";

function parseFlexibleDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const replaced = trimmed.replace(/\//g, "-");
  const spaced = replaced.replace(/\s+/g, " ");
  const candidate = /^\d{4}-\d{2}-\d{2}$/.test(spaced)
    ? new Date(`${spaced}T00:00:00`)
    : /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(spaced)
    ? new Date(spaced.replace(" ", "T") + ":00")
    : new Date(spaced.replace(" ", "T"));
  if (Number.isNaN(candidate.getTime())) {
    return null;
  }
  return candidate;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export async function GET(
  req: Request,
  { params }: { params: { slug: string } },
) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const slug = normalizeSlugInput(params.slug ?? "");
  const group = await prisma.group.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!group) {
    return NextResponse.json({ message: "group not found" }, { status: 404 });
  }

  const baseStart = parseFlexibleDate(from) ?? parseFlexibleDate(to) ?? new Date();
  const baseEnd = parseFlexibleDate(to) ?? baseStart;
  const start = startOfDay(baseStart);
  const end = endOfDay(baseEnd);

  const rows = await prisma.reservation.findMany({
    where: {
      groupId: group.id,
      // [範囲が重なっている] 条件
      NOT: [{ end: { lte: start } }],
      AND: [{ start: { lt: end } }],
    },
    orderBy: { start: "asc" },
    select: {
      id: true,
      start: true,
      end: true,
      device: { select: { name: true, slug: true } },
      note: true,
    },
  });

  return NextResponse.json({ data: rows });
}
