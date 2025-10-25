export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

type ParsedUrl = {
  protocol: string
  host: string
  hostname: string
  port: string | null
  pathname: string
  search: string | null
  hasPooler: boolean
} | null

function parse(url: string | undefined): ParsedUrl {
  try {
    if (!url) return null
    const u = new URL(url)
    return {
      protocol: u.protocol.replace(':', ''),
      host: u.host,
      hostname: u.hostname,
      port: u.port || null,
      pathname: u.pathname,
      search: u.search || null,
      hasPooler: u.hostname.includes('-pooler.'),
    }
  } catch {
    return null
  }
}

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`

    const rows = await prisma.$queryRaw<Array<{ regclass: string | null }>>`
      SELECT to_regclass('public."User"') AS regclass
    `
    const exists = rows?.[0]?.regclass !== null

    return NextResponse.json({
      ok: true,
      runtime: {
        DATABASE_URL: parse(process.env.DATABASE_URL),
        DIRECT_URL: parse(process.env.DIRECT_URL),
      },
      userTable: exists ? 'present' : 'absent',
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 },
    )
  }
}
