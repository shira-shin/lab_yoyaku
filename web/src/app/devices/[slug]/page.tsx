import { serverFetch } from '@/lib/server-fetch';
import { notFound, redirect } from 'next/navigation';

export default async function DeviceGlobal({ params }: { params: { slug: string } }) {
  const res = await serverFetch(`/api/devices/${encodeURIComponent(params.slug)}`);
  if (res.status === 404) return notFound();
  if (!res.ok) throw new Error(`load device failed: ${res.status}`);
  const dev = await res.json();
  if (!dev?.device?.groupSlug) return notFound();
  redirect(`/groups/${dev.device.groupSlug}/devices/${dev.device.slug}`);
}
