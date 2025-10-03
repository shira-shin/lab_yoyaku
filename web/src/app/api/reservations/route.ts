import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { localPartsToUtc, localStringToUtcDate } from "@/lib/time";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { deviceId, deviceSlug, groupSlug, date, start, end } = body as {
    deviceId?: string; deviceSlug?: string; groupSlug?: string; date?: string; start: string; end: string;
  };

  // group & device を厳格に突き合わせ（他グループデバイスへの誤登録を防止）
  const device = await prisma.device.findFirst({
    where: {
      id: deviceId ?? undefined,
      slug: deviceSlug ?? undefined,
      group: groupSlug ? { slug: groupSlug } : undefined,
    },
    select: { id: true },
  });
  if (!device) return NextResponse.json({ message: "device not found in the group" }, { status: 400 });

  // 「入力文字列をローカル時刻として」UTCに変換して保存（ズレ防止）
  let startAt: Date | null = null;
  let endAt: Date | null = null;
  try {
    const hasDate = typeof date === "string" && date.length >= 10;
    const isTimeOnly = (value: string | undefined) => typeof value === "string" && /^\d{1,2}:\d{2}(:\d{2})?$/.test(value);
    if (hasDate && isTimeOnly(start) && isTimeOnly(end)) {
      startAt = localPartsToUtc(date!, start);
      endAt = localPartsToUtc(date!, end);
    } else {
      startAt = localStringToUtcDate(start);
      endAt = localStringToUtcDate(end);
    }
  } catch {
    return NextResponse.json({ message: "invalid datetime" }, { status: 400 });
  }
  if (!(startAt instanceof Date) || Number.isNaN(+startAt) || !(endAt instanceof Date) || Number.isNaN(+endAt))
    return NextResponse.json({ message: "invalid datetime" }, { status: 400 });
  if (+endAt <= +startAt)
    return NextResponse.json({ message: "end must be after start" }, { status: 400 });

  const created = await prisma.reservation.create({
    data: {
      start: startAt,
      end: endAt,
      userEmail: session.user.email,     // スキーマの必須項目
      device: { connect: { id: device.id } },
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}

// （不要な GET 叩きに 405 を返す）
export function GET() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}
