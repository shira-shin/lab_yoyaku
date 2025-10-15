export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'
import { normalizeEmail, readUserFromCookie } from '@/lib/auth-legacy'

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

    const normalizedEmail = normalizeEmail(me.email)
    const isMember =
      normalizeEmail(device.group.hostEmail ?? '') === normalizedEmail ||
      device.group.members.some((member) => normalizeEmail(member.email) === normalizedEmail)
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
