import { loadDB } from '@/lib/mockdb';
import QRCode from 'qrcode';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const db = loadDB();
  const device = db.groups
    .flatMap((g: any) => g.devices ?? [])
    .find((d: any) => d.slug === params.slug);
  if (!device) return new Response('Not found', { status: 404 });

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const url = `${base}/devices/${device.slug}?t=${device.qrToken}`;

  const dataUrl = await QRCode.toDataURL(url, { margin: 1, scale: 6 });
  const base64 = dataUrl.split(',')[1]!;
  const buf = Buffer.from(base64, 'base64');

  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    },
  });
}

