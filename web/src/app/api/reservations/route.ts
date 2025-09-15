import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'

export const dynamic = 'force-dynamic'

type ReservationRequestBody = {
  groupSlug: string
  deviceSlug: string
  start: Date
  end: Date
  purpose?: string
}

type ValidationResult =
  | { ok: true; value: ReservationRequestBody }
  | { ok: false; error: string }

function parseReservationBody(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'invalid body' }
  }

  const record = payload as Record<string, unknown>

  const groupSlug = record.groupSlug
  if (typeof groupSlug !== 'string' || groupSlug.length === 0) {
    return { ok: false, error: 'groupSlug must be a non-empty string' }
  }

  const deviceSlug = record.deviceSlug
  if (typeof deviceSlug !== 'string' || deviceSlug.length === 0) {
    return { ok: false, error: 'deviceSlug must be a non-empty string' }
  }

  const start = record.start
  if (typeof start !== 'string' || start.length === 0) {
    return { ok: false, error: 'start must be a non-empty string' }
  }
  const startDate = new Date(start)
  if (Number.isNaN(startDate.getTime())) {
    return { ok: false, error: 'start must be a valid date string' }
  }

  const end = record.end
  if (typeof end !== 'string' || end.length === 0) {
    return { ok: false, error: 'end must be a non-empty string' }
  }
  const endDate = new Date(end)
  if (Number.isNaN(endDate.getTime())) {
    return { ok: false, error: 'end must be a valid date string' }
  }

  let purpose: string | undefined
  if (record.purpose !== undefined) {
    if (typeof record.purpose !== 'string') {
      return { ok: false, error: 'purpose must be a string if provided' }
    }
    purpose = record.purpose
  }

  return {
    ok: true,
    value: {
      groupSlug,
      deviceSlug,
      start: startDate,
      end: endDate,
      purpose,
    },
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const groupSlug = searchParams.get('group') ?? ''
  const rows = await prisma.reservation.findMany({
    where: { device: { group: { slug: groupSlug } } },
    include: { device: { select: { slug: true, group: { select: { slug: true } } } } },
    orderBy: { createdAt: 'desc' },
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

  const result = parseReservationBody(parsed)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  const body = result.value

  const device = await prisma.device.findFirst({
    where: { slug: body.deviceSlug, group: { slug: body.groupSlug } },
    select: { id: true },
  })
  if (!device) {
    return NextResponse.json({ error: 'device not found' }, { status: 404 })
  }

  const me = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/auth/me`, { cache: 'no-store' }).then(r => r.json())
  const userEmail = me?.email ?? 'unknown@example.com'

  if (body.start >= body.end) {
    return NextResponse.json({ error: 'invalid time range' }, { status: 400 })
  }

  const created = await prisma.reservation.create({
    data: {
      deviceId: device.id,
      userEmail,
      start: body.start,
      end: body.end,
      purpose: body.purpose,
    },
  })
  return NextResponse.json(created, { status: 201 })
}
