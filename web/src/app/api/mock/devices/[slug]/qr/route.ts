import { db } from '@/lib/mock-db';
import QRCode from 'qrcode';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const device = db.groups.flatMap((g) => g.devices).find((d) => d.slug === params.slug);
  if (!device) {
    return new Response('device not found', { status: 404 });
  }
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const url = `${base}/d/${device.slug}?t=${device.qrToken}`;
  const png = await QRCode.toBuffer(url, { width: 512, margin: 1 });
  return new Response(png, {
    headers: { 'Content-Type': 'image/png' },
  });
}
