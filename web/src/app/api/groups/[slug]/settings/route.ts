export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { readUserFromCookie } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  try {
    const me = await readUserFromCookie()
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const slug = params.slug.toLowerCase()
    const group = await prisma.group.findFirst({
      where: { slug, deletedAt: null },
      include: { members: true },
    })

    if (!group) {
      return NextResponse.json({ error: 'group not found' }, { status: 404 })
    }

    const membership = group.members.find((member) => member.email === me.email)
    const isOwner = group.hostEmail === me.email
    const isManager = membership?.role === 'MANAGER' || membership?.role === 'OWNER'

    if (!(isOwner || isManager)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const allow = Boolean(body?.allowMemberDeviceCreate)

    const updated = await prisma.group.update({
      where: { id: group.id },
      data: { allowMemberDeviceCreate: allow },
      select: { id: true, allowMemberDeviceCreate: true },
    })

    return NextResponse.json({
      ok: true,
      group: { id: updated.id, allowMemberDeviceCreate: updated.allowMemberDeviceCreate },
    })
  } catch (error) {
    console.error('update group settings failed', error)
    return NextResponse.json({ error: 'update group settings failed' }, { status: 500 })
  }
}
