export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { APP_TZ, dayRangeInUtc } from "@/lib/time";

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const deviceId = searchParams.get("deviceId") ?? undefined;
    const deviceSlug = searchParams.get("deviceSlug") ?? undefined;
    const fromParam = parseDate(searchParams.get("from"));
    const toParam = parseDate(searchParams.get("to"));

    const targetDate =
      dateParam ??
      new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ }).format(new Date());

    const { dayStartUtc, dayEndUtc } = dayRangeInUtc(targetDate);
    const rangeStart = fromParam ?? dayStartUtc;
    const rangeEnd = toParam ?? dayEndUtc;

    const rows = await prisma.reservation.findMany({
      where: {
        device: {
          group: { slug: params.slug },
          ...(deviceId ? { id: deviceId } : {}),
          ...(deviceSlug ? { slug: deviceSlug } : {}),
        },
        ...(rangeStart ? { end: { gt: rangeStart } } : {}),
        ...(rangeEnd ? { start: { lt: rangeEnd } } : {}),
      },
      orderBy: { start: "asc" },
      include: {
        device: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const items = rows.map((reservation) => ({
      id: reservation.id,
      deviceId: reservation.device.id,
      deviceSlug: reservation.device.slug,
      deviceName: reservation.device.name,
      device: {
        id: reservation.device.id,
        name: reservation.device.name,
        slug: reservation.device.slug,
      },
      startsAtUTC: reservation.start.toISOString(),
      endsAtUTC: reservation.end.toISOString(),
      purpose: reservation.purpose,
      userEmail: reservation.userEmail,
      userName: reservation.user?.name ?? reservation.userName ?? null,
      user: reservation.user
        ? {
            id: reservation.user.id,
            name: reservation.user.name ?? null,
            email: reservation.user.email ?? reservation.userEmail ?? null,
          }
        : null,
    }));

    return new NextResponse(JSON.stringify({ items }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[group.reservations.GET]", err);
    return NextResponse.json(
      { error: "Failed to load reservations" },
      { status: 500 },
    );
  }
}
