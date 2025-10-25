export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { hash as bcryptHash } from 'bcryptjs'
import { randomUUID } from 'crypto'
import { normalizeEmail, readUserFromCookie } from '@/lib/auth-legacy'
import { findUserByEmailNormalized } from '@/lib/users'
import { prisma } from '@/server/db/prisma'
import { updateUserNameByEmail } from '@/lib/db'

const NAME_MAX_LENGTH = 80

function normalizeName(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

export async function GET() {
  const me = await readUserFromCookie()
  console.info('[api.me.profile.GET]', {
    hasUserId: Boolean(me?.id),
    hasEmail: Boolean(me?.email),
  })
  if (!me?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const existing = await findUserByEmailNormalized(me.email)

  if (!existing) {
    return NextResponse.json({
      data: {
        id: me.id ?? null,
        email: me.email,
        name: me.name ?? '',
      },
    })
  }

  return NextResponse.json({
    data: {
      id: existing.id,
      email: existing.email ?? me.email,
      name: existing.name ?? '',
    },
  })
}

export async function PUT(req: Request) {
  const me = await readUserFromCookie()
  console.info('[api.me.profile.PUT]', {
    hasUserId: Boolean(me?.id),
    hasEmail: Boolean(me?.email),
  })
  if (!me?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const name = normalizeName((payload as any)?.name)
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (name.length > NAME_MAX_LENGTH) {
    return NextResponse.json({ error: 'name too long' }, { status: 400 })
  }

  const tempPasswordHash = await bcryptHash(randomUUID(), 10)
  const normalizedEmail = normalizeEmail(me.email)

  let updated: { id: string; email: string | null; name: string | null }
  const existing = await findUserByEmailNormalized(me.email)
  if (existing) {
    updated = await prisma.user.update({
      where: { id: existing.id },
      data: { name, email: normalizedEmail },
      select: { id: true, email: true, name: true },
    })
  } else {
    updated = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        passwordHash: tempPasswordHash,
      },
      select: { id: true, email: true, name: true },
    })
  }

  await updateUserNameByEmail(me.email, name)

  return NextResponse.json({ data: updated })
}
