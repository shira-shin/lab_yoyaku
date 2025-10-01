import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { normalizeSlugInput } from "@/lib/slug";

function parseDayParam(input: string | null): { start: Date; end: Date } | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const dayStart = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(dayStart.getTime())) {
    return null;
  }
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  return { start: dayStart, end: dayEnd };
}

function parseFromIso(input: string | null): { start: Date; end: Date } | null {
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export async function GET(
  req: Request,
  { params }: { params: { slug: string } },
) {
  const url = new URL(req.url);
  const dayParam =
    url.searchParams.get("date") ?? url.searchParams.get("day") ?? url.searchParams.get("on");
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const slug = normalizeSlugInput(params.slug ?? "");
  const group = await prisma.group.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!group) {
    return NextResponse.json({ message: "group not found" }, { status: 404 });
  }

  const range =
    parseDayParam(dayParam) ?? parseFromIso(fromParam) ?? parseFromIso(toParam);
  if (!range) {
    return NextResponse.json({ message: "invalid date" }, { status: 400 });
  }

  const rows = await prisma.reservation.findMany({
    where: {
      device: { group: { slug } },
      NOT: [{ end: { lte: range.start } }],
      AND: [{ start: { lt: range.end } }],
    },
    orderBy: { start: "asc" },
    select: {
      id: true,
      start: true,
      end: true,
      device: { select: { id: true, name: true, slug: true } },
    },
  });

  const data = rows.map((reservation) => ({
    id: reservation.id,
    startAt: reservation.start.toISOString(),
    endAt: reservation.end.toISOString(),
    device: reservation.device,
  }));

  return NextResponse.json({ data });
}
