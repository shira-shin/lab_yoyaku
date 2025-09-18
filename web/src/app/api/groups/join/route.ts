export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { hashPassword, readUserFromCookie } from '@/lib/auth'

const normalize = (value: string) => value.trim().toLowerCase()

export async function POST(req: Request) {
  try {
    const me = await readUserFromCookie()
    console.info('[api.groups.join.POST]', {
      hasUserId: Boolean(me?.id),
      hasEmail: Boolean(me?.email),
    })
    if (!me?.email) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 })
    }

    const slugRaw = String((body as any).slug || '').trim()
    const queryRaw = String((body as any).query || slugRaw).trim()
    const passwordRaw = String((body as any).password || '')
    if (!queryRaw) {
      return NextResponse.json({ ok: false, error: 'query is required' }, { status: 400 })
    }

    const queryNorm = normalize(queryRaw)
    const group = await prisma.group.findFirst({
      where: {
        OR: [
          { slug: queryNorm },
          { name: { equals: queryRaw, mode: 'insensitive' } },
        ],
      },
      include: { members: true },
    })

    if (!group) {
      return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 })
    }

    if (group.passcode) {
      const hashed = hashPassword(passwordRaw)
      if (hashed !== group.passcode) {
        return NextResponse.json({ ok: false, error: 'wrong password' }, { status: 403 })
      }
    }

    const alreadyMember =
      group.hostEmail === me.email || group.members.some((member) => member.email === me.email)

    if (!alreadyMember) {
      await prisma.groupMember.create({ data: { groupId: group.id, email: me.email } })
    }

    return NextResponse.json({ ok: true, data: { slug: group.slug, name: group.name } })
  } catch (error) {
    console.error('join group failed', error)
    return NextResponse.json({ ok: false, error: 'join group failed' }, { status: 500 })
  }
}
