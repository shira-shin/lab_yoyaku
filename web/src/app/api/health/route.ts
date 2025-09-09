export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const r = await prisma.$queryRaw`SELECT NOW()`
    return new Response(JSON.stringify({ ok: true, r }), { status: 200 })
  } catch (e: any) {
    console.error('DB health error:', e)
    return new Response(
      JSON.stringify({ ok: false, error: e.message }),
      { status: 500 }
    )
  }
}
