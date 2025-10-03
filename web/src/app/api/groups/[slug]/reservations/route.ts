import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { localDayRange, toUtc } from "@/lib/time";

const parseBoundary = (value?: string | null) => {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  try {
    return toUtc(value);
  } catch {
    return null;
  }
};

export async function GET(_: Request, { params, url }: { params: { slug: string }, url: string }) {
  const u = new URL(url);
  const date = u.searchParams.get("date"); // "YYYY-MM-DD" 指定時は日別
  const deviceId = u.searchParams.get("deviceId") ?? undefined;
  const deviceSlug = u.searchParams.get("deviceSlug") ?? undefined;
  const fromParam = u.searchParams.get("from");
  const toParam = u.searchParams.get("to");
  const group = await prisma.group.findUnique({ where: { slug: params.slug }, select: { id: true } });
  if (!group) return NextResponse.json({ data: [] });

  const deviceFilter = {
    groupId: group.id,
    ...(deviceId ? { id: deviceId } : {}),
    ...(deviceSlug ? { slug: deviceSlug } : {}),
  };

  let startBoundary: Date | null = null;
  let endBoundary: Date | null = null;

  if (date) {
    try {
      const { start, end } = localDayRange(date);
      startBoundary = start;
      endBoundary = end;
    } catch {
      startBoundary = null;
      endBoundary = null;
    }
  } else {
    startBoundary = parseBoundary(fromParam);
    endBoundary = parseBoundary(toParam);
  }

  const andConditions: any[] = [];
  if (endBoundary) {
    andConditions.push({ start: { lt: endBoundary } });
  }
  if (startBoundary) {
    andConditions.push({ end: { gt: startBoundary } });
  }

  const where = {
    device: deviceFilter,
    ...(andConditions.length ? { AND: andConditions } : {}),
  };

  const rows = await prisma.reservation.findMany({
    where,
    orderBy: { start: "asc" },
    include: { device: { select: { name: true, slug: true } } },
  });

  return NextResponse.json({ data: rows });
}
