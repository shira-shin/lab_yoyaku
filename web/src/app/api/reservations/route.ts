import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-legacy";
import { prisma } from "@/lib/prisma";
import { toUtcIsoZ } from "@/lib/time";

function mustUtcIsoZ(value: unknown): string {
  if (typeof value !== "string" || !/\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    throw new Error(`Require UTC ISO (Z): ${value}`);
  }
  return value;
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { deviceId, deviceSlug, groupSlug, startsAtUTC, endsAtUTC, purpose } = body as {
    deviceId?: string;
    deviceSlug?: string;
    groupSlug?: string;
    startsAtUTC?: string;
    endsAtUTC?: string;
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

  let startAt: Date;
  let endAt: Date;
  try {
    const startIso = mustUtcIsoZ(startsAtUTC);
    const endIso = mustUtcIsoZ(endsAtUTC);
    startAt = new Date(startIso);
    endAt = new Date(endIso);
    console.info('[api payload]', { startsAtUTC: startIso, endsAtUTC: endIso });
  } catch (error) {
    console.error('[api payload parse error]', error);
    return NextResponse.json({ message: "invalid datetime" }, { status: 400 });
  }
  if (!(startAt instanceof Date) || Number.isNaN(startAt.getTime()))
    return NextResponse.json({ message: "invalid datetime" }, { status: 400 });
  if (!(endAt instanceof Date) || Number.isNaN(endAt.getTime()))
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
    select: { id: true, start: true, end: true },
  });

  const createdStartsAt = toUtcIsoZ(created.start);
  const createdEndsAt = toUtcIsoZ(created.end);

  return new NextResponse(
    JSON.stringify({
      id: created.id,
      item: {
        ...created,
        startsAtUTC: createdStartsAt,
        endsAtUTC: createdEndsAt,
      },
    }),
    {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    },
  );
}

// （不要な GET 叩きに 405 を返す）
export function GET() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}
