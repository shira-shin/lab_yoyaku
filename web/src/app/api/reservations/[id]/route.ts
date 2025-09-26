export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { readUserFromCookie } from '@/lib/auth'

function canManage(role: string | null | undefined) {
  return role === 'OWNER' || role === 'MANAGER'
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await readUserFromCookie()
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const reservation = await prisma.reservation.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
        device: { deletedAt: null, group: { deletedAt: null } },
      },
      include: {
        device: {
          include: {
            group: { include: { members: true } },
          },
        },
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    const group = reservation.device.group
    const membership = group.members.find((member) => member.email === me.email)
    const isOwner = group.hostEmail === me.email
    const role = isOwner ? 'OWNER' : membership?.role
    const isAllowed = reservation.userEmail === me.email || canManage(role)

    if (!isAllowed) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    if (reservation.end < new Date() && !canManage(role)) {
      return NextResponse.json({ error: 'cannot cancel past reservation' }, { status: 400 })
    }

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { deletedAt: new Date() },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('delete reservation failed', error)
    return NextResponse.json({ error: 'delete reservation failed' }, { status: 500 })
  }
}
