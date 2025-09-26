export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { readUserFromCookie } from '@/lib/auth'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await readUserFromCookie()
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const device = await prisma.device.findFirst({
      where: { id: params.id, deletedAt: null, group: { deletedAt: null } },
      include: { group: { include: { members: true } } },
    })

    if (!device) {
      return NextResponse.json({ error: 'device not found' }, { status: 404 })
    }

    const membership = device.group.members.find((member) => member.email === me.email)
    const isOwner = device.group.hostEmail === me.email
    const isMember = isOwner || !!membership
    if (!isMember) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      device: {
        id: device.id,
        slug: device.slug,
        name: device.name,
        groupSlug: device.group.slug,
      },
    })
  } catch (error) {
    console.error('load device by id failed', error)
    return NextResponse.json({ error: 'load device failed' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await readUserFromCookie()
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const device = await prisma.device.findFirst({
      where: { id: params.id, deletedAt: null, group: { deletedAt: null } },
      include: { group: { include: { members: true } } },
    })

    if (!device) {
      return NextResponse.json({ error: 'device not found' }, { status: 404 })
    }

    const membership = device.group.members.find((member) => member.email === me.email)
    const isOwner = device.group.hostEmail === me.email
    const isManager = membership?.role === 'MANAGER' || membership?.role === 'OWNER'

    if (!(isOwner || isManager)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    await prisma.device.update({
      where: { id: device.id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('delete device failed', error)
    return NextResponse.json({ error: 'delete device failed' }, { status: 500 })
  }
}
