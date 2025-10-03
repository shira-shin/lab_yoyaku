import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { APP_TZ, toUTC } from "@/lib/time";

const toUtcFromLocalString = (value: string, tz: string = APP_TZ) => {
  const normalized = value.trim().replace(" ", "T");
  const iso = /T\d{2}:\d{2}(?::\d{2})?$/.test(normalized) ? normalized : `${normalized}:00`;
  const base = new Date(iso);
  if (Number.isNaN(base.getTime())) throw new Error(`Invalid date string: ${value}`);
  const projected = toUTC(base, tz);
  const offset = projected.getTime() - base.getTime();
  return new Date(base.getTime() - offset);
};

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { deviceId, deviceSlug, groupSlug, start, end } = body as {
    deviceId?: string; deviceSlug?: string; groupSlug?: string; start: string; end: string;
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
  const startAt = toUtcFromLocalString(start);
  const endAt   = toUtcFromLocalString(end);
  if (!(startAt instanceof Date) || isNaN(+startAt) || !(endAt instanceof Date) || isNaN(+endAt))
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

  return NextResponse.json({ id: created.id }, { status: 201 });
}

// （不要な GET 叩きに 405 を返す）
export function GET() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}
