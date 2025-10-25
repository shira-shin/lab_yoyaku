export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'

import { prisma } from '@/server/db/prisma'

type ParsedUrl = {
  protocol: string
  hostname: string
  host: string
  dbname: string
  hasPooler: boolean
}

function parseUrl(raw?: string | null): ParsedUrl | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    return {
      protocol: url.protocol.replace(':', ''),
      hostname: url.hostname,
      host: url.host,
      dbname: url.pathname,
      hasPooler: url.hostname.includes('-pooler.'),
    }
  } catch (error) {
    return null
  }
}

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    const result = await prisma.$queryRaw<Array<{ regclass: string | null }>>`
      SELECT to_regclass('public."User"') AS regclass
    `
    const userPresent = result?.[0]?.regclass !== null

    return NextResponse.json({
      ok: true,
      runtime: {
        DATABASE_URL: parseUrl(process.env.DATABASE_URL),
        DIRECT_URL: parseUrl(process.env.DIRECT_URL),
        vercel: process.env.VERCEL ?? '0',
        nodeEnv: process.env.NODE_ENV ?? 'unknown',
      },
      userTable: userPresent ? 'present' : 'absent',
    })
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : `${e}`
    return NextResponse.json({ ok: false, error }, { status: 500 })
  }
}
