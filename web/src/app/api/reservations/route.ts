import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { z } from 'zod'
import { readUserFromCookie } from '@/lib/auth'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const ReservationBodySchema = z.object({
  groupSlug: z.string().min(1),
  deviceSlug: z.string().min(1),
  start: z.coerce.date(),
  end: z.coerce.date(),
  purpose: z.string().optional(),
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const groupSlug = searchParams.get('group') ?? ''
  const deviceSlug = searchParams.get('device') ?? ''
  const deviceFilter: Prisma.DeviceWhereInput = {}
  if (groupSlug) deviceFilter.group = { slug: groupSlug.toLowerCase() }
  if (deviceSlug) deviceFilter.slug = deviceSlug.toLowerCase()
  const where: Prisma.ReservationWhereInput = {}
  if (Object.keys(deviceFilter).length > 0) where.device = deviceFilter
  const rows = await prisma.reservation.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    include: {
      device: {
        select: { slug: true, name: true, group: { select: { slug: true } } },
      },
    },
    orderBy: { start: 'asc' },
  })
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  let parsed: unknown
  try {
    parsed = await req.json()
  } catch (error) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const parsedResult = ReservationBodySchema.safeParse(parsed)
  if (!parsedResult.success) {
    const flattened = 'error' in parsedResult ? parsedResult.error.flatten() : { formErrors: ['invalid body'], fieldErrors: {} }
    return NextResponse.json({ error: flattened }, { status: 400 })
  }
  const body = parsedResult.data

  const me = await readUserFromCookie()
  if (!me?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const device = await prisma.device.findFirst({
    where: { slug: body.deviceSlug, group: { slug: body.groupSlug } },
    select: { id: true },
  })
  if (!device) {
    return NextResponse.json({ error: 'device not found' }, { status: 404 })
  }

  if (body.start >= body.end) {
    return NextResponse.json({ error: 'invalid time range' }, { status: 400 })
  }

  const profile = await prisma.userProfile.findUnique({ where: { email: me.email } })
  const displayName = profile?.displayName || me.name || me.email.split('@')[0]

  const created = await prisma.reservation.create({
    data: {
      deviceId: device.id,
      userEmail: me.email,
      userName: displayName,
      start: body.start,
      end: body.end,
      purpose: body.purpose,
    },
    include: {
      device: {
        select: {
          slug: true,
          name: true,
          group: { select: { slug: true } },
        },
      },
    },
  })
  return NextResponse.json({ reservation: created }, { status: 201 })
}
