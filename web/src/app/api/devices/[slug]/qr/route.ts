export const dynamic = 'force-dynamic'
export const revalidate = 0

import { randomUUID } from 'crypto'
import QRCode from 'qrcode'
import { prisma } from '@/server/db/prisma'
import { getBaseUrl } from '@/lib/http/base-url'


export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const device = await prisma.device.findFirst({
    where: { slug: params.slug.toLowerCase() },
    include: { group: true },
  })
  if (!device) return new Response('Not found', { status: 404 })

  const base = getBaseUrl()

  let token = device.qrToken as string | null | undefined
  if (!token) {
    token = randomUUID()
    await prisma.device.update({
      where: { id: device.id },
      data: { qrToken: token },
    })
  }

  const url = `${base}/devices/${device.slug}?t=${token}`
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
