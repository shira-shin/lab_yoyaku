export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/server/db/prisma'
import { getServerSession, normalizeEmail } from '@/lib/auth-legacy'
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
    const session = await getServerSession()
    const emailRaw = session?.user?.email ?? ''
    const email = typeof emailRaw === 'string' ? emailRaw.trim() : ''
    const normalizedEmail = normalizeEmail(email)
    const name = session?.user?.name?.trim() || null

    if (!normalizedEmail) {
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

    let dbUser = await prisma.user.findUnique({ where: { normalizedEmail } })
    const fallbackName = email.split('@')[0]
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          email,
          normalizedEmail,
          name: name || fallbackName,
        },
      })
    } else if (name && dbUser.name !== name) {
      dbUser = await prisma.user.update({ where: { normalizedEmail }, data: { name, email } })
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
        return NextResponse.json({ ok: false, code: 'bad_password', error: 'invalid passcode' }, { status: 401 })
      }
    }

    const existingMember = group.members.find(
      (member) => normalizeEmail(member.email) === normalizedEmail,
    )

    const membership = await prisma.groupMember.upsert({
      where: { groupId_email: { groupId: group.id, email: normalizedEmail } },
      update: { userId: dbUser.id },
      create: { groupId: group.id, email: normalizedEmail, userId: dbUser.id, role: 'MEMBER' },
    })

    console.info('[join]', { email: normalizedEmail, userId: dbUser.id, groupId: group.id })

    if (existingMember) {
      return NextResponse.json(
        {
          ok: false,
          code: 'already_member',
          data: { slug: group.slug, name: group.name ?? group.slug, memberId: membership.id },
        },
        { status: 409 },
      )
    }

    return NextResponse.json({
      ok: true,
      code: 'joined',
      data: { slug: group.slug, name: group.name ?? group.slug, memberId: membership.id },
    })
  } catch (error) {
    console.error('join group failed', error)
    return NextResponse.json({ ok: false, code: 'internal_error', error: 'join group failed' }, { status: 500 })
  }
}
