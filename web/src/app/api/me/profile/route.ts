export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { readUserFromCookie } from '@/lib/auth'
import { prisma } from '@/src/lib/prisma'

export async function GET() {
  const me = await readUserFromCookie()
  if (!me?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const profile = await prisma.userProfile.findUnique({ where: { email: me.email } })
  return NextResponse.json({ displayName: profile?.displayName ?? null, email: me.email })
}

export async function PUT(req: Request) {
  const me = await readUserFromCookie()
  if (!me?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const displayName = String(body?.displayName || '').trim()

  const updated = await prisma.userProfile.upsert({
    where: { email: me.email },
    update: { displayName: displayName || null },
    create: { email: me.email, displayName: displayName || null },
  })

  return NextResponse.json({ ok: true, displayName: updated.displayName ?? null })
}
