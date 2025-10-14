export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return Response.json({ ok: true })
  } catch (e) {
    return new Response('db NG', { status: 500 })
  }
}
