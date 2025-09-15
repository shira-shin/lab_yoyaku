import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const Body = z.object({
  groupSlug: z.string().min(1),
  deviceSlug: z.string().min(1),
  start: z.string().transform((s) => new Date(s)),
  end: z.string().transform((s) => new Date(s)),
  purpose: z.string().optional(),
})

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
  const body = Body.parse(await req.json())

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
