export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { serverFetch } from '@/lib/http/server-fetch';
import { unstable_noStore as noStore } from 'next/cache';
import { notFound, redirect } from 'next/navigation';

export default async function DeviceGlobal({ params }: { params: { slug: string } }) {
  noStore();
  const res = await serverFetch(`/api/devices/${encodeURIComponent(params.slug)}`);
  if (res.status === 401) {
    redirect(`/login?next=/devices/${params.slug}`);
  }
  if (res.status === 404) return notFound();
  if (!res.ok) {
    redirect(`/login?next=/devices/${params.slug}`);
  }
  const dev = await res.json();
  if (!dev?.device?.groupSlug) return notFound();
  redirect(`/groups/${dev.device.groupSlug}/devices/${dev.device.slug}`);
}
