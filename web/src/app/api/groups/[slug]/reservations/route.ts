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
      // Device -> Group 経由でグループ絞り込み
      device: { group: { id: group.id } },
      // 期間が重なるものだけ
      AND: [{ start: { lt: end } }, { end: { gt: start } }],
    },
    orderBy: { start: "asc" },
    include: {
      device: { select: { name: true, slug: true } },
    },
  });

  // FE は startAt / endAt を想定しているのでキーを揃えて返す
  const data = rows.map((r: any) => ({
    id: r.id,
    device: r.device,
    // Prisma スキーマに note が無い環境向けフォールバック
    note: r.note ?? r.memo ?? null,
    startAt: r.start,
    endAt: r.end,
  }));

  return NextResponse.json({ data });
}
