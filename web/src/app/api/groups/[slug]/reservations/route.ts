export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { readUserFromCookie } from '@/lib/auth'
import { z } from 'zod'

const QuerySchema = z.object({
  date: z.string().min(1),
})

function parseDateOnly(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, month, day)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
}

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const me = await readUserFromCookie()
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const slug = params.slug.toLowerCase()
    const url = new URL(req.url)
    const parsed = QuerySchema.safeParse({ date: url.searchParams.get('date') ?? '' })

    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid query' }, { status: 400 })
    }

    const day = parseDateOnly(parsed.data.date)
    if (!day) {
      return NextResponse.json({ error: 'invalid date' }, { status: 400 })
    }

    const end = new Date(day)
    end.setDate(end.getDate() + 1)

    const group = await prisma.group.findFirst({
      where: { slug, deletedAt: null },
      include: { members: true, devices: { where: { deletedAt: null }, select: { id: true, name: true, slug: true } } },
    })

    if (!group) {
      return NextResponse.json({ error: 'group not found' }, { status: 404 })
    }

    const membership = group.members.find((member) => member.email === me.email)
    const isOwner = group.hostEmail === me.email
    const isMember = isOwner || !!membership

    if (!isMember) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        device: { groupId: group.id, deletedAt: null },
        deletedAt: null,
        start: { lt: end },
        end: { gt: day },
      },
      include: {
        device: { select: { id: true, slug: true, name: true } },
      },
      orderBy: { start: 'asc' },
    })

    const emails = Array.from(new Set(reservations.map((r) => r.userEmail)))
    const profiles = emails.length
      ? await prisma.userProfile.findMany({ where: { email: { in: emails } } })
      : []
    const displayNameMap = new Map(profiles.map((profile) => [profile.email, profile.displayName || '']))

    const payload = reservations.map((reservation) => ({
      id: reservation.id,
      deviceId: reservation.deviceId,
      deviceSlug: reservation.device.slug,
      deviceName: reservation.device.name,
      start: reservation.start.toISOString(),
      end: reservation.end.toISOString(),
      purpose: reservation.purpose ?? null,
      userEmail: reservation.userEmail,
      userName:
        reservation.userName ||
        displayNameMap.get(reservation.userEmail) ||
        reservation.userEmail.split('@')[0],
    }))

    return NextResponse.json({
      date: day.toISOString(),
      reservations: payload,
      devices: group.devices,
      viewerRole: isOwner ? 'OWNER' : membership?.role ?? null,
    })
  } catch (error) {
    console.error('load group reservations failed', error)
    return NextResponse.json({ error: 'load group reservations failed' }, { status: 500 })
  }
}
