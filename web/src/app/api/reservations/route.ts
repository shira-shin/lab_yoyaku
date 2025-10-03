import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { APP_TZ, localWallclockToUtc } from "@/lib/time";

function parseIncomingDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    return date;
  }
  try {
    return localWallclockToUtc(date, APP_TZ);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { deviceId, deviceSlug, groupSlug, startsAtUTC, endsAtUTC, start, end, purpose } = body as {
    deviceId?: string;
    deviceSlug?: string;
    groupSlug?: string;
    startsAtUTC?: string;
    endsAtUTC?: string;
    start?: string;
    end?: string;
    purpose?: string;
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

  const startAt = parseIncomingDate(startsAtUTC ?? start ?? "");
  const endAt = parseIncomingDate(endsAtUTC ?? end ?? "");
  if (!startAt || !endAt)
    return NextResponse.json({ message: "invalid datetime" }, { status: 400 });
  if (endAt.getTime() <= startAt.getTime())
    return NextResponse.json({ message: "end must be after start" }, { status: 400 });

  const created = await prisma.reservation.create({
    data: {
      start: startAt,
      end: endAt,
      userEmail: session.user.email,     // スキーマの必須項目
      device: { connect: { id: device.id } },
      purpose: purpose?.trim() ? purpose.trim() : undefined,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}

// （不要な GET 叩きに 405 を返す）
export function GET() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}
