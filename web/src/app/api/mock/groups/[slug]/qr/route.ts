import { loadDB } from '@/lib/mockdb';
import QRCode from 'qrcode';
import { getBaseUrl } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const db = loadDB();
  const group = db.groups.find((g: any) => g.slug === params.slug);
  if (!group) return new Response('Not found', { status: 404 });

  const base = getBaseUrl();
  const url = `${base}/groups/${group.slug}`;

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
