export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { z } from '@/lib/zod'
import { readUserFromCookie } from '@/lib/auth'
import { prisma } from '@/src/lib/prisma'

const ParamsSchema = z.object({
  id: z.string().min(1),
})

const UpdateSchema = z.object({
  groupSlug: z.string().min(1).optional(),
  reminderMinutes: z
    .coerce.number()
    .int()
    .min(0)
    .max(24 * 60)
    .nullable()
    .optional(),
})

async function loadReservation(id: string) {
  return prisma.reservation.findUnique({
    where: { id },
    include: {
      device: { include: { group: true } },
      user: { select: { id: true } },
    },
  })
}

function isOwner(reservation: Awaited<ReturnType<typeof loadReservation>>, userId: string, email: string) {
  if (!reservation) return false
  if (reservation.userId) {
    return reservation.userId === userId
  }
  return reservation.userEmail.toLowerCase() === email.toLowerCase()
}

function toPayload(reservation: NonNullable<Awaited<ReturnType<typeof loadReservation>>>) {
  return {
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
    userName: reservation.userName ?? null,
    userId: reservation.user?.id ?? reservation.userId ?? null,
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await readUserFromCookie()
  if (!me?.email || !me?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const parsedParams = ParamsSchema.safeParse(params)
  if (!parsedParams.success) {
    return NextResponse.json({ error: 'invalid reservation id' }, { status: 400 })
  }

  const bodyRaw = await req.json().catch(() => ({}))
  const parsedBody = UpdateSchema.safeParse(bodyRaw)
  if (!parsedBody.success) {
    if ('error' in parsedBody) {
      return NextResponse.json({ error: parsedBody.error.flatten() }, { status: 400 })
    }
    return NextResponse.json({ error: { formErrors: ['invalid body'], fieldErrors: {} } }, { status: 400 })
  }

  const { id } = parsedParams.data
  const { groupSlug, reminderMinutes } = parsedBody.data
  const normalizedGroupSlug = groupSlug?.toLowerCase()

  const reservation = await loadReservation(id)
  if (!reservation) {
    return NextResponse.json({ error: 'reservation not found' }, { status: 404 })
  }

  if (normalizedGroupSlug && reservation.device.group.slug !== normalizedGroupSlug) {
    return NextResponse.json({ error: 'reservation not found' }, { status: 404 })
  }

  if (!isOwner(reservation, me.id, me.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const updates: { reminderMinutes?: number | null } = {}
  if (reminderMinutes !== undefined) {
    updates.reminderMinutes = reminderMinutes ?? null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, data: toPayload(reservation) })
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: updates,
    include: {
      device: { include: { group: true } },
      user: { select: { id: true } },
    },
  })

  return NextResponse.json({ ok: true, data: toPayload(updated) })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const me = await readUserFromCookie()
  if (!me?.email || !me?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const parsedParams = ParamsSchema.safeParse(params)
  if (!parsedParams.success) {
    return NextResponse.json({ error: 'invalid reservation id' }, { status: 400 })
  }

  const bodyRaw = await req.json().catch(() => ({}))
  const groupSlug = typeof bodyRaw?.groupSlug === 'string' ? bodyRaw.groupSlug.toLowerCase() : null

  const { id } = parsedParams.data

  const reservation = await loadReservation(id)
  if (!reservation) {
    return NextResponse.json({ error: 'reservation not found' }, { status: 404 })
  }

  if (groupSlug && reservation.device.group.slug !== groupSlug) {
    return NextResponse.json({ error: 'reservation not found' }, { status: 404 })
  }

  if (!isOwner(reservation, me.id, me.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  await prisma.reservation.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
