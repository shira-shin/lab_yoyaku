import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { localPartsToUtc } from "@/lib/time";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    deviceId,
    deviceSlug,
    groupSlug,
    start,
    end,
    startTime,
    endTime,
    date,
    endDate,
  } = body as {
    deviceId?: string;
    deviceSlug?: string;
    groupSlug?: string;
    start?: string;
    end?: string;
    startTime?: string;
    endTime?: string;
    date?: string;
    endDate?: string;
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
  const pickTime = (value?: string) => (typeof value === "string" ? value : "");
  const normalizeTime = (value: string) => value.trim();

  const resolveParts = (datePart?: string, timePart?: string) => {
    if (!datePart || !timePart) return null;
    return { date: datePart, time: timePart };
  };

  const splitDateTime = (value: string) => {
    const normalized = value.trim().replace("T", " ");
    const [datePart, timePart] = normalized.split(/\s+/);
    if (!datePart || !timePart) return null;
    return { date: datePart, time: timePart };
  };

  const startTimeValue = normalizeTime(pickTime(startTime ?? start));
  const endTimeValue = normalizeTime(pickTime(endTime ?? end));
  const startParts = (() => {
    if (date && startTimeValue && !startTimeValue.includes("T") && !startTimeValue.includes(" ")) {
      return resolveParts(date, startTimeValue);
    }
    if (startTimeValue) return splitDateTime(startTimeValue);
    return null;
  })();
  const endParts = (() => {
    const dateCandidate = endDate || date;
    if (dateCandidate && endTimeValue && !endTimeValue.includes("T") && !endTimeValue.includes(" ")) {
      return resolveParts(dateCandidate, endTimeValue);
    }
    if (endTimeValue) return splitDateTime(endTimeValue);
    return null;
  })();

  if (!startParts || !endParts) {
    return NextResponse.json({ message: "invalid datetime" }, { status: 400 });
  }

  const startAt = localPartsToUtc(startParts.date, startParts.time);
  const endAt = localPartsToUtc(endParts.date, endParts.time);
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

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}

// （不要な GET 叩きに 405 を返す）
export function GET() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}
