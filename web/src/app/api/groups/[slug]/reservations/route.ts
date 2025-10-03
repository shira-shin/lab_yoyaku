import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { APP_TZ, dayRangeInUtc } from "@/lib/time";

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const deviceId = searchParams.get("deviceId") ?? undefined;
    const deviceSlug = searchParams.get("deviceSlug") ?? undefined;

    const targetDate =
      dateParam ??
      new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ }).format(new Date());

    const { dayStartUtc, dayEndUtc } = dayRangeInUtc(targetDate);

    const rows = await prisma.reservation.findMany({
      where: {
        device: {
          group: { slug: params.slug },
          ...(deviceId ? { id: deviceId } : {}),
          ...(deviceSlug ? { slug: deviceSlug } : {}),
        },
        NOT: [{ end: { lte: dayStartUtc } }],
        AND: [{ start: { lt: dayEndUtc } }],
      },
      orderBy: { start: "asc" },
      select: {
        id: true,
        start: true,
        end: true,
        userEmail: true,
        device: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    const items = rows.map((reservation) => ({
      id: reservation.id,
      startAt: reservation.start.toISOString(),
      endAt: reservation.end.toISOString(),
      userEmail: reservation.userEmail,
      device: reservation.device,
    }));

    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    console.error("[group.reservations.GET]", err);
    return NextResponse.json(
      { error: "Failed to load reservations" },
      { status: 500 },
    );
  }
}
