import { getGroup, listDevices, listReservations } from '@/lib/server-api';
import { notFound } from 'next/navigation';
import GroupScreenClient from './GroupScreenClient';

export default async function GroupPage({ params }: { params: { slug: string } }) {
  const groupRes = await getGroup(params.slug);
  const group = groupRes.data;
  if (!groupRes.ok || !group) return notFound();

  const devicesRes = await listDevices(group.slug);
  const reservationsRes = await listReservations(group.slug);

  return (
    <GroupScreenClient
      initialGroup={group}
      initialDevices={devicesRes.data || []}
      initialReservations={reservationsRes.data || []}
    />
  );
}
