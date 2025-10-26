export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { readUserFromCookie } from '@/lib/auth-legacy'
import { prisma } from '@/server/prisma'

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

  const orConditions: Array<{ userEmail?: string; userId?: string }> = [{ userEmail: me.email }]
  if (me.id) {
    orConditions.push({ userId: me.id })
  }

  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        OR: orConditions,
        ...(from && to ? { AND: [{ start: { lt: to } }, { end: { gt: from } }] } : {}),
      },
      orderBy: { start: 'asc' },
      take,
      select: {
        id: true,
        createdAt: true,
        userId: true,
        start: true,
        end: true,
        deviceId: true,
        userEmail: true,
        userName: true,
        purpose: true,
        reminderMinutes: true,
        device: {
          select: {
            slug: true,
            name: true,
            group: {
              select: {
                id: true,
                slug: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
    const payload = reservations.map((reservation) => ({
      id: reservation.id,
      deviceId: reservation.deviceId,
      deviceSlug: reservation.device?.slug ?? null,
      deviceName: reservation.device?.name ?? null,
      groupId: reservation.device?.group?.id ?? null,
      groupSlug: reservation.device?.group?.slug ?? null,
      groupName: reservation.device?.group?.name ?? reservation.device?.group?.slug ?? null,
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
  } catch (e: any) {
    if (e?.code === 'P2021') {
      console.warn('[api.me.reservations.GET] table missing; returning empty []')
      return NextResponse.json({ ok: true, data: [], all: [], items: [], total: 0 })
    }
    throw e
  }
}
