export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { readUserFromCookie } from '@/lib/auth-legacy'
import { prisma } from '@/server/db/prisma'
import type { Prisma } from '@prisma/client'


function parseDate(value: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseTake(value: string | null): number {
  if (!value) return 50
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 50
  const intValue = Math.floor(parsed)
  if (intValue < 1) return 50
  if (intValue > 100) return 100
  return intValue
}

export async function GET(req: Request) {
  const me = await readUserFromCookie()
  console.info('[api.me.reservations.GET]', {
    hasUserId: Boolean(me?.id),
    hasEmail: Boolean(me?.email),
  })
  if (!me?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const from = parseDate(url.searchParams.get('from'))
  const to = parseDate(url.searchParams.get('to'))
  const take = parseTake(url.searchParams.get('take'))

  const orConditions: Prisma.ReservationWhereInput[] = [{ userEmail: me.email }]
  if (me.id) {
    orConditions.push({ userId: me.id })
  }

  const where: Prisma.ReservationWhereInput = { OR: orConditions }
  if (from && to) {
    where.AND = [{ start: { lt: to } }, { end: { gt: from } }]
  }

  const reservations = await prisma.reservation.findMany({
    where,
    orderBy: { start: 'asc' },
    take,
    include: {
      device: {
        select: {
          id: true,
          slug: true,
          name: true,
          group: { select: { id: true, slug: true, name: true } },
        },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  })

  const payload = reservations.map((reservation) => ({
    id: reservation.id,
    deviceId: reservation.deviceId,
    deviceSlug: reservation.device.slug,
    deviceName: reservation.device.name,
    groupId: reservation.device.group.id,
    groupSlug: reservation.device.group.slug,
    groupName: reservation.device.group.name ?? reservation.device.group.slug,
    startsAtUTC: reservation.start.toISOString(),
    endsAtUTC: reservation.end.toISOString(),
    start: reservation.start.toISOString(),
    end: reservation.end.toISOString(),
    purpose: reservation.purpose ?? null,
    reminderMinutes: reservation.reminderMinutes ?? null,
    userEmail: reservation.userEmail,
    userId: reservation.userId ?? null,
    userName: reservation.user?.name ?? me.name ?? null,
    user: reservation.user
      ? {
          id: reservation.user.id,
          name: reservation.user.name ?? null,
          email: reservation.user.email ?? null,
        }
      : {
          id: reservation.userId ?? null,
          name: me.name ?? null,
          email: reservation.userEmail,
        },
    participants: [] as string[],
  }))

  return NextResponse.json({ ok: true, data: payload, all: payload })
}
