export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { readUserFromCookie } from '@/lib/auth'

function toISO(value: Date | null | undefined) {
  return value ? value.toISOString() : null
}

async function buildGroupPayload(slug: string) {
  const group = await prisma.group.findUnique({
    where: { slug },
    include: {
      members: true,
      devices: {
        orderBy: { name: 'asc' },
        include: { reservations: { orderBy: { start: 'asc' } } },
      },
    },
  })

  if (!group) return null

  const reservations = group.devices.flatMap((device) =>
    device.reservations.map((reservation) => ({
      id: reservation.id,
      deviceId: device.id,
      deviceSlug: device.slug,
      deviceName: device.name,
      start: reservation.start,
      end: reservation.end,
      purpose: reservation.purpose ?? null,
      userEmail: reservation.userEmail,
      userName: reservation.userName ?? null,
      reminderMinutes: reservation.reminderMinutes ?? null,
      userId: reservation.userId,
    }))
  )

  const profileEmails = Array.from(
    new Set([
      group.hostEmail,
      ...group.members.map((member) => member.email),
      ...reservations.map((reservation) => reservation.userEmail),
    ])
  )

  const profiles = profileEmails.length
    ? await prisma.userProfile.findMany({ where: { email: { in: profileEmails } } })
    : []
  const displayNameMap = new Map(profiles.map((profile) => [profile.email, profile.displayName || '']))

  const reservationsPayload = reservations.map((reservation) => ({
    id: reservation.id,
    deviceId: reservation.deviceId,
    deviceSlug: reservation.deviceSlug,
    deviceName: reservation.deviceName,
    start: reservation.start.toISOString(),
    end: reservation.end.toISOString(),
    purpose: reservation.purpose,
    reminderMinutes: reservation.reminderMinutes,
    userEmail: reservation.userEmail,
    userName:
      reservation.userName ||
      displayNameMap.get(reservation.userEmail) ||
      reservation.userEmail.split('@')[0],
    userId: reservation.userId,
  }))

  reservationsPayload.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  )

  return {
    group,
    reservations: reservationsPayload,
    members: Array.from(new Set([group.hostEmail, ...group.members.map((member) => member.email)])),
    devices: group.devices.map((device) => ({
      id: device.id,
      slug: device.slug,
      name: device.name,
      caution: device.caution ?? null,
      code: device.code ?? null,
    })),
  }
}

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const me = await readUserFromCookie()
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const slug = params.slug.toLowerCase()
    const payload = await buildGroupPayload(slug)
    if (!payload) {
      return NextResponse.json({ error: 'group not found' }, { status: 404 })
    }

    const { group, reservations, members, devices } = payload
    const isMember = members.includes(me.email)
    if (!isMember) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    return NextResponse.json({
    group: {
      id: group.id,
      slug: group.slug,
      name: group.name,
      host: group.hostEmail,
      reserveFrom: toISO(group.reserveFrom),
      reserveTo: toISO(group.reserveTo),
      memo: group.memo ?? null,
      deviceManagePolicy: group.deviceManagePolicy,
      dutyManagePolicy: group.dutyManagePolicy,
      members,
      devices,
      reservations,
    },
  })
  } catch (error) {
    console.error('load group failed', error)
    return NextResponse.json({ error: 'load group failed' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  try {
    const me = await readUserFromCookie()
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const slug = params.slug.toLowerCase()
    const group = await prisma.group.findUnique({
      where: { slug },
      include: { members: true },
    })

    if (!group) {
      return NextResponse.json({ error: 'group not found' }, { status: 404 })
    }

    if (group.hostEmail !== me.email) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const reserveFromRaw = body?.reserveFrom ?? body?.reserve_from
    const reserveToRaw = body?.reserveTo ?? body?.reserve_to
    const memoRaw = body?.memo
    const hostRaw = body?.host
    const policyRaw = body?.deviceManagePolicy ?? body?.device_manage_policy
    const dutyPolicyRaw = body?.dutyManagePolicy ?? body?.duty_manage_policy

    const updates: any = {}
    if (reserveFromRaw !== undefined) {
      const date = reserveFromRaw ? new Date(String(reserveFromRaw)) : null
      updates.reserveFrom = date && !Number.isNaN(date.getTime()) ? date : null
    }
    if (reserveToRaw !== undefined) {
      const date = reserveToRaw ? new Date(String(reserveToRaw)) : null
      updates.reserveTo = date && !Number.isNaN(date.getTime()) ? date : null
    }
    if (memoRaw !== undefined) {
      const memo = String(memoRaw || '').trim()
      updates.memo = memo || null
    }
    if (hostRaw !== undefined) {
      const nextHost = String(hostRaw || '').trim()
      if (nextHost) {
        const allowed =
          nextHost === group.hostEmail || group.members.some((member) => member.email === nextHost)
        if (!allowed) {
          return NextResponse.json({ error: 'host not member' }, { status: 400 })
        }
        updates.hostEmail = nextHost
      }
    }
    if (policyRaw !== undefined) {
      const value = String(policyRaw)
      if (value === 'HOST_ONLY' || value === 'MEMBERS_ALLOWED') {
        updates.deviceManagePolicy = value as 'HOST_ONLY' | 'MEMBERS_ALLOWED'
      }
    }
    if (dutyPolicyRaw !== undefined) {
      const value = String(dutyPolicyRaw)
      if (value === 'ADMINS_ONLY' || value === 'MEMBERS_ALLOWED') {
        updates.dutyManagePolicy = value as 'ADMINS_ONLY' | 'MEMBERS_ALLOWED'
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.group.update({ where: { id: group.id }, data: updates })
    }

    const payload = await buildGroupPayload(slug)
    if (!payload) {
      return NextResponse.json({ error: 'group not found' }, { status: 404 })
    }

    return NextResponse.json({
      group: {
        id: payload.group.id,
        slug: payload.group.slug,
        name: payload.group.name,
        host: payload.group.hostEmail,
        reserveFrom: toISO(payload.group.reserveFrom),
        reserveTo: toISO(payload.group.reserveTo),
        memo: payload.group.memo ?? null,
        members: payload.members,
        devices: payload.devices,
        reservations: payload.reservations,
        deviceManagePolicy: payload.group.deviceManagePolicy,
        dutyManagePolicy: payload.group.dutyManagePolicy,
      },
    })
  } catch (error) {
    console.error('update group failed', error)
    return NextResponse.json({ error: 'update group failed' }, { status: 500 })
  }
}
