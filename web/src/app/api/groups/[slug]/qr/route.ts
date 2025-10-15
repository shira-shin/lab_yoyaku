export const dynamic = 'force-dynamic'
export const revalidate = 0

import QRCode from 'qrcode'
import { prisma } from '@/server/db/prisma'
import { getBaseUrl } from '@/lib/http/base-url'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const group = await prisma.group.findUnique({ where: { slug: params.slug.toLowerCase() } })
  if (!group) return new Response('Not found', { status: 404 })

  const base = getBaseUrl()
  const url = `${base}/groups/${group.slug}`
  const dataUrl = await QRCode.toDataURL(url, { margin: 1, scale: 6 })
  const base64 = dataUrl.split(',')[1] ?? ''
  const buf = Buffer.from(base64, 'base64')

  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    },
  })
}
