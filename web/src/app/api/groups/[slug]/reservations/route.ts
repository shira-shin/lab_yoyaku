import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dayRangeUtc, localStringToUtcDate } from "@/lib/time";

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

  const notConditions: any[] = [];
  const andConditions: any[] = [];

  if (date) {
    const { startUtc, endUtc } = dayRangeUtc(date);
    notConditions.push({ end: { lte: startUtc } });
    andConditions.push({ start: { lt: endUtc } });
  } else {
    if (fromParam) {
      const fromDate = (() => {
        const parsed = new Date(fromParam);
        if (!Number.isNaN(parsed.getTime())) return parsed;
        try {
          return localStringToUtcDate(fromParam);
        } catch {
          return null;
        }
      })();
      if (fromDate) {
        notConditions.push({ end: { lte: fromDate } });
      }
    }
    if (toParam) {
      const toDate = (() => {
        const parsed = new Date(toParam);
        if (!Number.isNaN(parsed.getTime())) return parsed;
        try {
          return localStringToUtcDate(toParam);
        } catch {
          return null;
        }
      })();
      if (toDate) {
        andConditions.push({ start: { lt: toDate } });
      }
    }
  }

  const where = {
    device: deviceFilter,
    ...(notConditions.length ? { NOT: notConditions } : {}),
    ...(andConditions.length ? { AND: andConditions } : {}),
  };

  const rows = await prisma.reservation.findMany({
    where,
    orderBy: { start: "asc" },
    include: { device: { select: { name: true, slug: true } } },
  });

  const data = rows.map((r) => ({
    id: r.id,
    startAt: r.start.toISOString(),
    endAt: r.end.toISOString(),
    device: r.device,
  }));

  return NextResponse.json({ ok: true, data });
}
