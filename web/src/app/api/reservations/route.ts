import { NextResponse } from "next/server";
import { z } from "@/lib/zod-shim";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  groupSlug: z.string().min(1),
  // どちらかが来る想定。どちらも来たら deviceId を優先
  deviceId: z.string().optional(),
  deviceSlug: z.string().optional(),
  start: z.string().min(1), // ISO or YYYY-MM-DD HH:mm
  end: z.string().min(1),
});

function parseFlexibleDate(input: string): Date {
  const s = (input ?? "").trim();
  // Date コンストラクタで素直に解釈（API 側は UTC/ISO を前提）
  const d = new Date(s);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${input}`);
  }
  return d;
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const body = Body.parse(raw);

    const group = await prisma.group.findUnique({
      where: { slug: body.groupSlug },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json({ error: "グループが見つかりません" }, { status: 404 });
    }

    // デバイス特定（id or slug）＋同一グループ所属チェック
    const device = await prisma.device.findFirst({
      where: {
        AND: [
          body.deviceId ? { id: body.deviceId } : {},
          body.deviceSlug ? { slug: body.deviceSlug } : {},
          { groupId: group.id },
        ],
      },
      select: { id: true },
    });
    if (!device) {
      return NextResponse.json({ error: "デバイスが見つからないか、グループ外です" }, { status: 400 });
    }

    const startAt = parseFlexibleDate(body.start);
    const endAt = parseFlexibleDate(body.end);
    if (!(startAt < endAt)) {
      return NextResponse.json({ error: "開始は終了より前である必要があります" }, { status: 400 });
    }

    // 予約重複チェック（同デバイス、時間重なり）
    const overlap = await prisma.reservation.findFirst({
      where: {
        deviceId: device.id,
        NOT: [{ end: { lte: startAt } }],
        AND: [{ start: { lt: endAt } }],
      },
      select: { id: true },
    });
    if (overlap) {
      return NextResponse.json({ error: "同時間帯に既存の予約があります" }, { status: 409 });
    }

    // ★ ここが本題: deviceId 直書きではなく、リレーション connect を使う
    const created = await prisma.reservation.create({
      data: {
        start: startAt,
        end: endAt,
        device: { connect: { id: device.id } },
      },
      select: { id: true },
    });

    return NextResponse.json({ data: { id: created.id } }, { status: 201 });
  } catch (e: any) {
    const msg = e?.message ?? "予約作成に失敗しました";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
