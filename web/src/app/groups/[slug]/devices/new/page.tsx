export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { redirect } from 'next/navigation';
import { getUserFromCookies } from '@/lib/auth/server';
import DeviceNewClient from './DeviceNewClient';

export default async function DeviceNewPage({ params }: { params: { slug: string } }) {
  const user = await getUserFromCookies();
  const destination = `/groups/${params.slug}/devices/new`;
  const signInUrl = `/signin?callbackUrl=${encodeURIComponent(destination)}`;
  if (!user) redirect(signInUrl);
  return <DeviceNewClient slug={params.slug} />;
}
