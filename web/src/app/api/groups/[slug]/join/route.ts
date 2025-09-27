export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { hashPassword, readUserFromCookie } from '@/lib/auth'

function normalizeSlug(value: string | string[] | undefined) {
  if (!value) return ''
  const str = Array.isArray(value) ? value[0] : value
  return String(str || '').trim().toLowerCase()
}

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    const me = await readUserFromCookie()
    console.info('[api.groups.join.POST]', {
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

    let body: unknown = null
    try {
      body = await req.json()
    } catch {
      body = null
    }
    const passcodeRaw = body && typeof body === 'object' ? (body as any)?.passcode : undefined
    const passcode = typeof passcodeRaw === 'string' ? passcodeRaw : undefined

    const group = await prisma.group.findUnique({ where: { slug } })
    if (!group) {
      return NextResponse.json({ error: 'group not found' }, { status: 404 })
    }

    if (group.passcode) {
      const hashed = hashPassword(passcode ?? '')
      if (hashed !== group.passcode) {
        return NextResponse.json({ error: 'invalid passcode' }, { status: 403 })
      }
    }

    await prisma.groupMember.upsert({
      where: { groupId_email: { groupId: group.id, email: me.email } },
      update: {},
      create: { groupId: group.id, email: me.email },
    })

    return NextResponse.json({ ok: true, data: { slug: group.slug, name: group.name ?? group.slug } })
  } catch (error) {
    console.error('join group failed', error)
    return NextResponse.json({ error: 'join group failed' }, { status: 500 })
  }
}
