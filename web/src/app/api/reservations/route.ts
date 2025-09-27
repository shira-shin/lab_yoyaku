export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { z } from '@/lib/zod-helpers'
import { readUserFromCookie } from '@/lib/auth'
import type { Prisma } from '@prisma/client'

const ReservationBodySchema = z.object({
  groupSlug: z.string().min(1),
  deviceSlug: z.string().min(1),
  start: z.coerce.date(),
  end: z.coerce.date(),
  purpose: z.string().optional(),
})

const QuerySchema = z.object({
  groupSlug: z.string().min(1),
  deviceSlug: z.string().optional(),
  date: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

function parseDateOnly(value: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2]) - 1
  const day = Number(m[3])
  const date = new Date(year, month, day)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
}

function normalizePurpose(value?: string) {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export async function GET(req: Request) {
  try {
    const me = await readUserFromCookie()
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const mine = url.searchParams.get('mine') === '1'
    const parsed = QuerySchema.safeParse({
      groupSlug: url.searchParams.get('groupSlug') ?? '',
      deviceSlug: url.searchParams.get('deviceSlug') ?? undefined,
      date: url.searchParams.get('date') ?? undefined,
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
    })

    if (!parsed.success) {
      const flattened = 'error' in parsed ? parsed.error.flatten() : { formErrors: ['invalid query'], fieldErrors: {} }
      return NextResponse.json({ error: flattened }, { status: 400 })
    }

    const { groupSlug, deviceSlug, date, from, to } = parsed.data
    const slug = groupSlug.toLowerCase()
    const deviceSlugNormalized = deviceSlug?.toLowerCase()

    let rangeStart: Date | null = null
    let rangeEnd: Date | null = null
    if (date) {
      const day = parseDateOnly(date)
      if (!day) {
        return NextResponse.json({ error: 'invalid date' }, { status: 400 })
      }
      rangeStart = day
      rangeEnd = new Date(day)
      rangeEnd.setDate(rangeEnd.getDate() + 1)
    } else {
      if (from) {
        rangeStart = new Date(from)
      }
      if (to) {
        rangeEnd = new Date(to)
      }
    }

    if (rangeStart && rangeEnd && rangeStart > rangeEnd) {
      return NextResponse.json({ error: 'invalid date range' }, { status: 400 })
    }

    const group = await prisma.group.findUnique({
      where: { slug },
      include: { members: true },
    })

    if (!group) {
      return NextResponse.json({ error: 'group not found' }, { status: 404 })
    }

    const isMember =
      group.hostEmail === me.email ||
      group.members.some((member) => member.email === me.email)

    if (!isMember) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const deviceWhere: Prisma.DeviceWhereInput = { groupId: group.id }
    if (deviceSlugNormalized) {
      deviceWhere.slug = deviceSlugNormalized
    }

    const where: Prisma.ReservationWhereInput = {
      device: deviceWhere,
    }
    if (rangeStart) {
      where.end = { gt: rangeStart }
    }
    if (rangeEnd) {
      where.start = { lt: rangeEnd }
    }
    if (mine) {
      const orConditions: Prisma.ReservationWhereInput[] = [{ userEmail: me.email }]
      if (me.id) {
        orConditions.push({ userId: me.id })
      }
      where.OR = orConditions
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        device: {
          select: {
            id: true,
            slug: true,
            name: true,
            group: { select: { slug: true } },
          },
        },
        user: { select: { id: true } },
      },
      orderBy: { start: 'asc' },
    })

    const emails = Array.from(new Set(reservations.map((r) => r.userEmail)))
    const profiles = emails.length
      ? await prisma.userProfile.findMany({ where: { email: { in: emails } } })
      : []
    const displayNameMap = new Map(
      profiles.map((profile) => [profile.email, profile.displayName || ''])
    )

    const payload = reservations.map((reservation) => ({
      id: reservation.id,
      deviceId: reservation.deviceId,
      deviceSlug: reservation.device.slug,
      deviceName: reservation.device.name,
      groupSlug: reservation.device.group.slug,
      start: reservation.start.toISOString(),
      end: reservation.end.toISOString(),
      purpose: reservation.purpose ?? null,
      reminderMinutes: reservation.reminderMinutes ?? null,
      userEmail: reservation.userEmail,
      userName:
        reservation.userName ||
        displayNameMap.get(reservation.userEmail) ||
        reservation.userEmail.split('@')[0],
      userId: reservation.user?.id ?? null,
    }))

    return NextResponse.json({ reservations: payload })
  } catch (error) {
    console.error('list reservations failed', error)
    return NextResponse.json({ error: 'list reservations failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    let parsedBody: unknown
    try {
      parsedBody = await req.json()
    } catch (error) {
      return NextResponse.json({ error: 'invalid body' }, { status: 400 })
    }

    const parsedResult = ReservationBodySchema.safeParse(parsedBody)
    if (!parsedResult.success) {
      const flattened = 'error' in parsedResult ? parsedResult.error.flatten() : { formErrors: ['invalid body'], fieldErrors: {} }
      return NextResponse.json({ error: flattened }, { status: 400 })
    }

    const body = parsedResult.data
    if (body.start >= body.end) {
      return NextResponse.json({ error: 'invalid time range' }, { status: 400 })
    }

    const me = await readUserFromCookie()
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const slug = body.groupSlug.toLowerCase()
    const deviceSlug = body.deviceSlug.toLowerCase()

    const device = await prisma.device.findFirst({
      where: { slug: deviceSlug, group: { slug } },
      include: { group: { include: { members: true } } },
    })

    if (!device) {
      return NextResponse.json({ error: 'device not found' }, { status: 404 })
    }

    const isMember =
      device.group.hostEmail === me.email ||
      device.group.members.some((member) => member.email === me.email)

    if (!isMember) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const conflict = await prisma.reservation.findFirst({
      where: {
        deviceId: device.id,
        start: { lt: body.end },
        end: { gt: body.start },
      },
    })

    if (conflict) {
      return NextResponse.json({ error: 'reservation conflict' }, { status: 409 })
    }

    const user = await prisma.user.upsert({
      where: { email: me.email },
      update: {
        name: me.name || undefined,
      },
      create: {
        email: me.email,
        name: me.name || null,
      },
    })

    const profile = await prisma.userProfile.findUnique({ where: { email: me.email } })
    const displayName = profile?.displayName || me.name || me.email.split('@')[0]

    const created = await prisma.reservation.create({
      data: {
        deviceId: device.id,
        userId: user.id,
        userEmail: me.email,
        userName: displayName,
        start: body.start,
        end: body.end,
        purpose: normalizePurpose(body.purpose),
      },
      include: {
        device: {
          select: {
            id: true,
            slug: true,
            name: true,
            group: { select: { slug: true } },
          },
        },
        user: { select: { id: true } },
      },
    })

    return NextResponse.json(
      {
        reservation: {
          id: created.id,
          deviceId: created.deviceId,
          deviceSlug: created.device.slug,
          deviceName: created.device.name,
          groupSlug: created.device.group.slug,
          start: created.start.toISOString(),
          end: created.end.toISOString(),
          purpose: created.purpose ?? null,
          reminderMinutes: created.reminderMinutes ?? null,
          userEmail: created.userEmail,
          userName: created.userName,
          userId: created.user?.id ?? null,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('create reservation failed', error)
    return NextResponse.json({ error: 'create reservation failed' }, { status: 500 })
  }
}
