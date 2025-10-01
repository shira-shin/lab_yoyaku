export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/src/lib/prisma'
import { readUserFromCookie } from '@/lib/auth'
import { normalizeSlugInput } from '@/lib/slug'

function normalize(value: string | string[] | undefined) {
  if (!value) return ''
  const str = Array.isArray(value) ? value[0] : value
  return normalizeSlugInput(String(str ?? ''))
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

    const slug = normalize(params?.slug)
    if (!slug) {
      return NextResponse.json({ error: 'invalid slug' }, { status: 400 })
    }

    let body: unknown = null
    try {
      body = await req.json()
    } catch {
      body = null
    }
    const passRaw = body && typeof body === 'object' ? (body as any)?.passcode : undefined
    const passcode = typeof passRaw === 'string' ? passRaw.trim() : ''

    const group = await prisma.group.findFirst({
      where: { slug: { equals: slug, mode: 'insensitive' } },
      select: {
        id: true,
        slug: true,
        name: true,
        passcode: true,
        members: { select: { id: true, email: true, userId: true } },
      },
    })
    if (!group) {
      return NextResponse.json({ error: 'group not found' }, { status: 404 })
    }

    if (group.passcode) {
      const ok = await bcrypt.compare(passcode || '', group.passcode)
      if (!ok) {
        return NextResponse.json({ error: 'invalid passcode' }, { status: 401 })
      }
    }

    const alreadyMember = group.members.find(
      (member) => member.email.toLowerCase() === me.email.toLowerCase() || (!!me.id && member.userId === me.id)
    )
    if (alreadyMember) {
      return NextResponse.json({ ok: true, data: { slug: group.slug, name: group.name ?? group.slug } })
    }

    await prisma.groupMember.create({
      data: { groupId: group.id, email: me.email, userId: me.id, role: 'MEMBER' },
    })

    return NextResponse.json({ ok: true, data: { slug: group.slug, name: group.name ?? group.slug } })
  } catch (error) {
    console.error('join group failed', error)
    return NextResponse.json({ error: 'join group failed' }, { status: 500 })
  }
}
