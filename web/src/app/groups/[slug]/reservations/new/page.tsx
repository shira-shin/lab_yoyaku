import { serverFetch } from '@/lib/server-fetch';
import { notFound, redirect } from 'next/navigation';
import NewReservationClient from './Client';

export const dynamic = 'force-dynamic';

export default async function NewReservationPage({ params }: { params: { slug: string } }) {
  const me = await serverFetch('/api/auth/me');
  if (me.status === 401) redirect(`/login?next=/groups/${params.slug}/reservations/new`);
  const res = await serverFetch(
    `/api/devices?groupSlug=${encodeURIComponent(params.slug)}`
  );
  if (res.status === 404) {
    return notFound();
  }
  if (!res.ok) throw new Error('failed to load devices');
  const { devices } = await res.json();
  return <NewReservationClient params={params} devices={devices} />;
}
