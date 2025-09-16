import { NextResponse } from 'next/server'
import { readUserFromCookie } from '@/lib/auth'
import { prisma } from '@/src/lib/prisma'
import type { Prisma } from '@prisma/client'

export const runtime = 'nodejs'

export async function GET() {
  const me = await readUserFromCookie()
  if (!me?.email) return NextResponse.json({ ok: false }, { status: 401 })

  const memberships = await prisma.groupMember.findMany({
    where: { email: me.email },
    select: { groupId: true },
  })
  const memberGroupIds = memberships.map((m) => m.groupId)

  const orConditions: Prisma.GroupWhereInput[] = [{ hostEmail: me.email }]
  if (memberGroupIds.length) {
    orConditions.push({ id: { in: memberGroupIds } })
  }

  const groups = await prisma.group.findMany({
    where: { OR: orConditions },
    select: { id: true, slug: true, name: true },
  })

  if (groups.length === 0) {
    return NextResponse.json({ ok: true, data: [], all: [] })
  }

  const groupIdMap = new Map(groups.map((g) => [g.id, g]))
  const reservations = await prisma.reservation.findMany({
    where: { device: { groupId: { in: Array.from(groupIdMap.keys()) } } },
    include: {
      device: {
        select: {
          id: true,
          slug: true,
          name: true,
          groupId: true,
        },
      },
    },
    orderBy: { start: 'asc' },
  })

  const profileEmails = Array.from(new Set(reservations.map((r) => r.userEmail)))
  const profiles = profileEmails.length
    ? await prisma.userProfile.findMany({ where: { email: { in: profileEmails } } })
    : []
  const displayNameMap = new Map(profiles.map((profile) => [profile.email, profile.displayName || '']))

  const all = reservations.map((reservation) => {
    const group = groupIdMap.get(reservation.device.groupId)!
    const userName =
      reservation.userName ||
      displayNameMap.get(reservation.userEmail) ||
      reservation.userEmail.split('@')[0]
    return {
      id: reservation.id,
      deviceId: reservation.deviceId,
      deviceSlug: reservation.device.slug,
      deviceName: reservation.device.name,
      groupSlug: group.slug,
      groupName: group.name ?? group.slug,
      start: reservation.start.toISOString(),
      end: reservation.end.toISOString(),
      purpose: reservation.purpose ?? null,
      userEmail: reservation.userEmail,
      userName,
    }
  })

  const now = Date.now()
  const upcoming = all
    .filter((reservation) => new Date(reservation.end).getTime() >= now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 10)

  return NextResponse.json({ ok: true, data: upcoming, all })
}

