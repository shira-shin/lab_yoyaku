export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { redirect } from 'next/navigation';
import { getUserFromCookies } from '@/lib/auth/server';
import DeviceNewClient from './DeviceNewClient';

export default async function DeviceNewPage({ params }: { params: { slug: string } }) {
  const user = await getUserFromCookies();
  if (!user) redirect(`/login?next=/groups/${params.slug}/devices/new`);
  return <DeviceNewClient slug={params.slug} />;
}
