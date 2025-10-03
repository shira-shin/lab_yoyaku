export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { readUserFromCookie } from '@/lib/auth'

export async function GET(
  _req: Request,
  { params }: { params: { slug: string; device: string } }
) {
  try {
    const me = await readUserFromCookie()
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const groupSlug = params.slug.toLowerCase()
    const deviceSlug = params.device.toLowerCase()

    const device = await prisma.device.findFirst({
      where: { slug: deviceSlug, group: { slug: groupSlug } },
      include: {
        group: { include: { members: true } },
        reservations: {
          orderBy: { start: 'asc' },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
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

    const profileEmails = Array.from(
      new Set([
        device.group.hostEmail,
        ...device.group.members.map((member) => member.email),
        ...device.reservations.map((reservation) => reservation.userEmail),
        ...device.reservations.map((reservation) => reservation.user?.email).filter(Boolean) as string[],
      ])
    )
    const profiles = profileEmails.length
      ? await prisma.userProfile.findMany({ where: { email: { in: profileEmails } } })
      : []
    const displayNameMap = new Map(profiles.map((profile) => [profile.email, profile.displayName || '']))

    const reservations = device.reservations.map((reservation) => {
      const fallbackName =
        reservation.userName ||
        displayNameMap.get(reservation.userEmail) ||
        reservation.userEmail.split('@')[0]

      return {
        id: reservation.id,
        deviceId: reservation.deviceId,
        deviceSlug: device.slug,
        deviceName: device.name,
        startsAtUTC: reservation.start.toISOString(),
        endsAtUTC: reservation.end.toISOString(),
        start: reservation.start.toISOString(),
        end: reservation.end.toISOString(),
        purpose: reservation.purpose ?? null,
        userEmail: reservation.userEmail,
        userName: reservation.user?.name ?? fallbackName,
        user: reservation.user
          ? {
              id: reservation.user.id,
              name: reservation.user.name ?? null,
              email: reservation.user.email ?? reservation.userEmail ?? null,
            }
          : null,
        reminderMinutes: reservation.reminderMinutes ?? null,
        userId: reservation.userId,
      }
    })

    return NextResponse.json({
      device: {
        id: device.id,
        slug: device.slug,
        name: device.name,
        caution: device.caution ?? null,
        code: device.code ?? null,
        groupSlug: device.group.slug,
      },
      reservations,
    })
  } catch (error) {
    console.error('load device failed', error)
    return NextResponse.json({ error: 'load device failed' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { slug: string; device: string } }
) {
  try {
    const me = await readUserFromCookie()
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const groupSlug = params.slug.toLowerCase()
    const deviceSlug = params.device.toLowerCase()

    const device = await prisma.device.findFirst({
      where: { slug: deviceSlug, group: { slug: groupSlug } },
      include: { group: { include: { members: true } } },
    })

    if (!device) {
      return NextResponse.json({ error: 'device not found' }, { status: 404 })
    }

    const canManage =
      device.group.deviceManagePolicy === 'MEMBERS_ALLOWED'
        ? device.group.hostEmail === me.email || device.group.members.some((member) => member.email === me.email)
        : device.group.hostEmail === me.email

    if (!canManage) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    await prisma.device.delete({ where: { id: device.id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('delete device failed', error)
    return NextResponse.json({ error: 'delete device failed' }, { status: 500 })
  }
}
