export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'default-no-store';

import { serverFetch } from '@/lib/server-fetch';
import { notFound, redirect } from 'next/navigation';
import { getUserFromCookies } from '@/lib/auth/server';
import NewReservationClient from './Client';

export default async function NewReservationPage({ params }: { params: { slug: string } }) {
  const user = await getUserFromCookies();
  if (!user) redirect(`/login?next=/groups/${params.slug}/reservations/new`);
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
