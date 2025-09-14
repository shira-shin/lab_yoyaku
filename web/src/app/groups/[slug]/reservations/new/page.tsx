import { serverFetch } from '@/lib/server-fetch';
import { redirect } from 'next/navigation';
import NewReservationClient from './Client';

export default async function NewReservationPage({ params }: { params: { slug: string } }) {
  const me = await serverFetch('/api/auth/me');
  if (me.status === 401) redirect(`/login?next=/groups/${params.slug}/reservations/new`);
  const res = await serverFetch(`/api/mock/groups/${params.slug}/devices`);
  if (!res.ok) throw new Error('failed to load devices');
  const { devices } = await res.json();
  return <NewReservationClient params={params} devices={devices} />;
}
