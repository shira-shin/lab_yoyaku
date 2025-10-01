import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ?date=YYYY-MM-DD （無ければ今日）で1日窓を作り、グループ配下の全デバイスの重なり予約を返す
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const group = await prisma.group.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json({ error: "グループが見つかりません" }, { status: 404 });
    }

    const url = new URL(_req.url);
    const dayStr = url.searchParams.get("date"); // "2025-10-09" など
    const base = dayStr ? new Date(`${dayStr}T00:00:00.000Z`) : new Date();
    const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 0, 0, 0));
    const end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + 1, 0, 0, 0));

    // ★ グループの絞り込みは Reservation 直下ではなく Device 経由
    const rows = await prisma.reservation.findMany({
      where: {
        device: { groupId: group.id },
        NOT: [{ end: { lte: start } }],
        AND: [{ start: { lt: end } }],
      },
      orderBy: { start: "asc" },
      select: {
        id: true,
        start: true,
        end: true,
        device: { select: { id: true, name: true, slug: true } },
      },
    });

    // フロントが期待するキー名（startAt/endAt）に合わせて整形
    const data = rows.map((r) => ({
      id: r.id,
      startAt: r.start,
      endAt: r.end,
      device: r.device,
    }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    const msg = e?.message ?? "予約取得に失敗しました";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
