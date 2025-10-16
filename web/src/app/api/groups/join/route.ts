export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/server/db/prisma'
import { normalizeEmail, readUserFromCookie } from '@/lib/auth-legacy'
import { normalizeSlugInput } from '@/lib/slug'
import { normalizeJoinInput } from '@/lib/text'

const normalize = (value: string) => normalizeSlugInput(value)

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
    const passwordInput = String((body as any).password || '')
    const passwordRaw = normalizeJoinInput(passwordInput)
    const trimmedPassword = passwordInput.trim()
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
      let ok = false
      const stored = group.passcode
      const roundsRaw = parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10)
      const rounds = Number.isNaN(roundsRaw) ? 10 : roundsRaw

      if (stored.startsWith('$2')) {
        if (passwordRaw) {
          ok = await bcrypt.compare(passwordRaw, stored)
        } else {
          ok = await bcrypt.compare('', stored)
        }
        if (!ok && passwordRaw !== trimmedPassword) {
          ok = await bcrypt.compare(trimmedPassword, stored)
        }
      } else {
        const normalizedStored = normalizeJoinInput(stored)
        ok = normalizedStored === passwordRaw || normalizedStored === normalizeJoinInput(trimmedPassword)
        if (ok) {
          const newHash = await bcrypt.hash(normalizedStored, rounds)
          await prisma.group.update({ where: { id: group.id }, data: { passcode: newHash } })
        }
      }

      if (!ok) {
        return NextResponse.json({ ok: false, error: 'wrong password' }, { status: 403 })
      }
    }

    const normalizedEmail = normalizeEmail(me.email)
    const alreadyMember =
      normalizeEmail(group.hostEmail ?? '') === normalizedEmail ||
      group.members.some((member) => normalizeEmail(member.email) === normalizedEmail)

    if (!alreadyMember) {
      await prisma.groupMember.create({
        data: { groupId: group.id, email: normalizedEmail, userId: me.id, role: 'MEMBER' },
      })
    } else {
      await prisma.groupMember.updateMany({
        where: { groupId: group.id, email: normalizedEmail },
        data: { userId: me.id },
      })
    }

    return NextResponse.json({ ok: true, data: { slug: group.slug, name: group.name } })
  } catch (error) {
    console.error('join group failed', error)
    return NextResponse.json({ ok: false, error: 'join group failed' }, { status: 500 })
  }
}
