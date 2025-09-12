import { serverFetch } from '@/lib/server-fetch';
import { redirect } from 'next/navigation';
import ClientPage from './ClientPage';

export default async function NewReservationPage({ params }: { params: { slug: string } }) {
  const me = await serverFetch('/api/auth/me');
  if (me.status === 401) redirect(`/login?next=/groups/${params.slug}/reservations/new`);
  return <ClientPage params={params} />;
}
