export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { z } from '@/lib/zod-helpers'
import { normalizeEmail, readUserFromCookie } from '@/lib/auth'
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
      device: {
        include: {
          group: {
            include: {
              members: {
                select: { id: true, email: true, createdAt: true, groupId: true },
              },
            },
          },
        },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  })
}

function isOwner(
  reservation: Awaited<ReturnType<typeof loadReservation>>,
  actorId: string | null,
  email: string,
) {
  if (!reservation) return false
  if (actorId && reservation.userId) {
    if (reservation.userId === actorId) {
      return true
    }
  }
  if (actorId && reservation.user?.id) {
    if (reservation.user.id === actorId) {
      return true
    }
  }
  return normalizeEmail(reservation.userEmail) === normalizeEmail(email)
}

function toPayload(reservation: NonNullable<Awaited<ReturnType<typeof loadReservation>>>) {
  return {
    id: reservation.id,
    deviceId: reservation.deviceId,
    deviceSlug: reservation.device.slug,
    deviceName: reservation.device.name,
    groupSlug: reservation.device.group.slug,
    startsAtUTC: reservation.start.toISOString(),
    endsAtUTC: reservation.end.toISOString(),
    start: reservation.start.toISOString(),
    end: reservation.end.toISOString(),
    purpose: reservation.purpose ?? null,
    reminderMinutes: reservation.reminderMinutes ?? null,
    userEmail: reservation.userEmail,
    userName: reservation.user?.name ?? reservation.userName ?? null,
    userId: reservation.user?.id ?? reservation.userId ?? null,
    user: reservation.user
      ? {
          id: reservation.user.id,
          name: reservation.user.name ?? null,
          email: reservation.user.email ?? reservation.userEmail ?? null,
        }
      : {
          id: reservation.userId ?? null,
          name: reservation.userName ?? null,
          email: reservation.userEmail,
        },
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await readUserFromCookie()
  if (!me?.email) {
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

  const normalizedEmail = normalizeEmail(me.email)
  const [reservation, actor] = await Promise.all([
    loadReservation(id),
    prisma.user.findUnique({ where: { normalizedEmail }, select: { id: true } }),
  ])
  if (!reservation) {
    return NextResponse.json({ error: 'reservation not found' }, { status: 404 })
  }

  if (normalizedGroupSlug && reservation.device.group.slug !== normalizedGroupSlug) {
    return NextResponse.json({ error: 'reservation not found' }, { status: 404 })
  }

  const actorId = actor?.id ?? null

  if (!isOwner(reservation, actorId, me.email)) {
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
      device: {
        include: {
          group: {
            include: {
              members: {
                select: { id: true, email: true, createdAt: true, groupId: true },
              },
            },
          },
        },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({ ok: true, data: toPayload(updated) })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const me = await readUserFromCookie()
  if (!me?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const parsedParams = ParamsSchema.safeParse(params)
  if (!parsedParams.success) {
    return NextResponse.json({ error: 'invalid reservation id' }, { status: 400 })
  }

  const bodyRaw = await req.json().catch(() => ({}))
  const groupSlug = typeof bodyRaw?.groupSlug === 'string' ? bodyRaw.groupSlug.toLowerCase() : null

  const { id } = parsedParams.data

  const normalizedEmail = normalizeEmail(me.email)
  const [reservation, actor] = await Promise.all([
    loadReservation(id),
    prisma.user.findUnique({ where: { normalizedEmail }, select: { id: true } }),
  ])
  if (!reservation) {
    return NextResponse.json({ error: 'reservation not found' }, { status: 404 })
  }

  if (groupSlug && reservation.device.group.slug !== groupSlug) {
    return NextResponse.json({ error: 'reservation not found' }, { status: 404 })
  }

  const actorId = actor?.id ?? null
  const isHost = normalizeEmail(reservation.device.group.hostEmail ?? '') === normalizeEmail(me.email)

  if (!isOwner(reservation, actorId, me.email) && !isHost) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  await prisma.reservation.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
