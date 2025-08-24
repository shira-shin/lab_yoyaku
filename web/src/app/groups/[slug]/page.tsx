import { getGroup, listDevices, listReservations } from '@/lib/server-api';
import { notFound } from 'next/navigation';
import GroupScreenClient from './GroupScreenClient';
import { readUserFromCookie } from '@/lib/auth';

export default async function GroupPage({ params }: { params: { slug: string } }) {
  const groupRes = await getGroup(params.slug);
  const group = groupRes.data;
  if (!groupRes.ok || !group) return notFound();

  const [devicesRes, reservationsRes, me] = await Promise.all([
    listDevices(group.slug),
    listReservations(group.slug),
    readUserFromCookie(),
  ]);

  return (
    <GroupScreenClient
      initialGroup={group}
      initialDevices={devicesRes.data || []}
      initialReservations={reservationsRes.data || []}
      defaultReserver={me?.name}
    />
  );
}
