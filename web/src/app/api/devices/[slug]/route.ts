export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { readUserFromCookie } from '@/lib/auth'

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const me = await readUserFromCookie()
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const slug = params.slug.toLowerCase()
    const device = await prisma.device.findFirst({
      where: { slug },
      include: { group: { include: { members: true } } },
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

    return NextResponse.json({
      device: {
        id: device.id,
        slug: device.slug,
        name: device.name,
        groupSlug: device.group.slug,
      },
    })
  } catch (error) {
    console.error('load device failed', error)
    return NextResponse.json({ error: 'load device failed' }, { status: 500 })
  }
}
