export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { readUserFromCookie } from '@/lib/auth'
import { prisma } from '@/src/lib/prisma'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const me = await readUserFromCookie()
    const body = await req.json()

    const name: string = body?.name ?? ''
    const passcode: string | null = body?.passcode ?? null
    const startAt: string | null = body?.start_at ?? null
    const endAt: string | null = body?.end_at ?? null
    const memo: string | null = body?.memo ?? null

    const createdBy = me?.email ?? 'demo@example.com'

    const rows = await prisma.$queryRaw<{
      id: string; name: string; slug: string; created_by: string; created_at: Date
    }[]>`
      INSERT INTO public.groups
        (name, passcode, start_at, end_at, memo, created_by)
      VALUES
        (${name}, ${passcode}, ${startAt}, ${endAt}, ${memo}, ${createdBy})
      RETURNING id, name, slug, created_by, created_at;
    `

    return NextResponse.json({ group: rows[0] }, { status: 201 })
  } catch (e: any) {
    console.error('create group failed', e)
    return NextResponse.json(
      { error: e?.message ?? 'create group failed' },
      { status: e?.status ?? 500 }
    )
  }
}

export async function GET() {
  try {
    const groups = await prisma.group.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, slug: true, createdAt: true }
    })
    return NextResponse.json(groups, { status: 200 })
  } catch (e: any) {
    console.error('list groups failed', e)
    return NextResponse.json(
      { error: e?.message ?? 'list groups failed' },
      { status: e?.status ?? 500 }
    )
  }
}
