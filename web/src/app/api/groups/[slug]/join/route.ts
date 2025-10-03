export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/src/lib/prisma'
import { readUserFromCookie } from '@/lib/auth'
import { normalizeSlugInput } from '@/lib/slug'
import { normalizeJoinInput } from '@/lib/text'

function normalize(value: string | string[] | undefined) {
  if (!value) return ''
  const str = Array.isArray(value) ? value[0] : value
  return normalizeSlugInput(String(str ?? ''))
}

const decodeSlug = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    const me = await readUserFromCookie()
    console.info('[api.groups.join.POST]', {
      hasUserId: Boolean(me?.id),
      hasEmail: Boolean(me?.email),
    })
    if (!me?.email) {
      return NextResponse.json({ ok: false, code: 'unauthorized', error: 'unauthorized' }, { status: 401 })
    }

    const rawSlug = params?.slug ?? ''
    const decodedSlug = decodeSlug(rawSlug)
    const slug = normalize(decodedSlug)
    console.info('[api.groups.join.POST] slug', { raw: rawSlug, decoded: decodedSlug, normalized: slug })
    if (!slug) {
      return NextResponse.json({ ok: false, code: 'invalid_slug', error: 'invalid slug' }, { status: 400 })
    }

    let body: unknown = null
    try {
      body = await req.json()
    } catch {
      body = null
    }
    const passRaw = body && typeof body === 'object' ? (body as any)?.passcode : undefined
    const passcodeInput = typeof passRaw === 'string' ? passRaw : ''
    const normalizedPasscode = normalizeJoinInput(passcodeInput)
    console.info('[api.groups.join.POST] passcode length', {
      rawLength: passcodeInput.length,
      normalizedLength: normalizedPasscode.length,
    })

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
      return NextResponse.json({ ok: false, code: 'group_not_found', error: 'group not found' }, { status: 404 })
    }

    if (group.passcode) {
      let ok = false
      const stored = group.passcode
      const trimmedPasscode = passcodeInput.trim()
      const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10)
      const rounds = Number.isNaN(bcryptRounds) ? 10 : bcryptRounds

      if (stored.startsWith('$2')) {
        if (normalizedPasscode) {
          ok = await bcrypt.compare(normalizedPasscode, stored)
        } else {
          ok = await bcrypt.compare('', stored)
        }
        if (!ok && normalizedPasscode !== trimmedPasscode) {
          ok = await bcrypt.compare(trimmedPasscode, stored)
        }
      } else {
        const normalizedStored = normalizeJoinInput(stored)
        ok = normalizedStored === normalizedPasscode || normalizedStored === normalizeJoinInput(trimmedPasscode)
        if (ok) {
          const newHash = await bcrypt.hash(normalizedStored, rounds)
          await prisma.group.update({ where: { id: group.id }, data: { passcode: newHash } })
        }
      }

      if (!ok) {
        return NextResponse.json({ ok: false, code: 'invalid_passcode', error: 'invalid passcode' }, { status: 401 })
      }
    }

    const alreadyMember = group.members.find(
      (member) => member.email.toLowerCase() === me.email.toLowerCase() || (!!me.id && member.userId === me.id)
    )
    if (alreadyMember) {
      return NextResponse.json({
        ok: true,
        code: 'already_member',
        data: { slug: group.slug, name: group.name ?? group.slug },
      })
    }

    await prisma.groupMember.create({
      data: { groupId: group.id, email: me.email, userId: me.id, role: 'MEMBER' },
    })

    return NextResponse.json({
      ok: true,
      code: 'joined',
      data: { slug: group.slug, name: group.name ?? group.slug },
    })
  } catch (error) {
    console.error('join group failed', error)
    return NextResponse.json({ ok: false, code: 'internal_error', error: 'join group failed' }, { status: 500 })
  }
}
