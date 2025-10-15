export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'

export async function GET() {
  try {
    const r = await prisma.$queryRaw`SELECT 1 as ok`
    return NextResponse.json({ ok: true, r }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 },
    )
  }
}
