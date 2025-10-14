export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeEmail, readUserFromCookie } from '@/lib/auth-legacy'

function normalizeSlug(value: string | string[] | undefined) {
  if (!value) return ''
  const str = Array.isArray(value) ? value[0] : value
  return String(str || '').trim().toLowerCase()
}

export async function POST(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const me = await readUserFromCookie()
    console.info('[api.groups.leave.POST]', {
      hasUserId: Boolean(me?.id),
      hasEmail: Boolean(me?.email),
    })
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const slug = normalizeSlug(params?.slug)
    if (!slug) {
      return NextResponse.json({ error: 'invalid slug' }, { status: 400 })
    }

    const group = await prisma.group.findUnique({ where: { slug } })
    if (!group) {
      return NextResponse.json({ error: 'group not found' }, { status: 404 })
    }

    if (normalizeEmail(group.hostEmail ?? '') === normalizeEmail(me.email)) {
      return NextResponse.json({ error: 'owner cannot leave' }, { status: 403 })
    }

    const normalizedEmail = normalizeEmail(me.email)
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_email: { groupId: group.id, email: normalizedEmail } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'not a member' }, { status: 400 })
    }

    await prisma.groupMember.delete({
      where: { groupId_email: { groupId: group.id, email: normalizedEmail } },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('leave group failed', error)
    return NextResponse.json({ error: 'leave group failed' }, { status: 500 })
  }
}
