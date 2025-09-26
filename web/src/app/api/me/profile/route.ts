export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { findUserByEmail, hashPassword, readUserFromCookie, verifyPassword } from '@/lib/auth'
import { prisma } from '@/src/lib/prisma'
import { updateUser } from '@/lib/db'

export async function GET() {
  const me = await readUserFromCookie()
  console.info('[api.me.profile.GET]', {
    hasUserId: Boolean(me?.id),
    hasEmail: Boolean(me?.email),
  })
  if (!me?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const profile = await prisma.userProfile.findUnique({ where: { email: me.email } })
  return NextResponse.json({ displayName: profile?.displayName ?? null, email: me.email })
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

  const body = await req.json().catch(() => ({}))
  const displayName = String(body?.displayName || '').trim()
  const currentPassword = body?.currentPassword ? String(body.currentPassword) : ''
  const newPassword = body?.newPassword ? String(body.newPassword) : ''
  const confirmPassword = body?.confirmPassword ? String(body.confirmPassword) : ''

  if (newPassword || confirmPassword || currentPassword) {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'password fields incomplete' }, { status: 400 })
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'new passwords do not match' }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'password too short' }, { status: 400 })
    }
    const userRecord = await findUserByEmail(me.email)
    if (!userRecord || !verifyPassword(currentPassword, userRecord.passHash)) {
      return NextResponse.json({ error: 'current password incorrect' }, { status: 403 })
    }
    await updateUser({ id: userRecord.id, passHash: hashPassword(newPassword) })
  }

  const updated = await prisma.userProfile.upsert({
    where: { email: me.email },
    update: { displayName: displayName || null },
    create: { email: me.email, displayName: displayName || null },
  })

  return NextResponse.json({ ok: true, displayName: updated.displayName ?? null })
}
