export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'default-no-store';

import { serverFetch } from '@/lib/server-fetch';
import { getUserFromCookies } from '@/lib/auth/server';
import { redirect, notFound } from 'next/navigation';
import GroupSettingsClient from './GroupSettingsClient';

export default async function GroupSettingsPage({ params }: { params: { slug: string } }) {
  const slug = params.slug.toLowerCase();
  const user = await getUserFromCookies();
  if (!user) redirect(`/login?next=/groups/${slug}/settings`);
  const res = await serverFetch(`/api/groups/${encodeURIComponent(slug)}`);
  if (res.status === 404) return notFound();
  if (!res.ok) throw new Error(`failed: ${res.status}`);
  const data = await res.json();
  const group = data?.group ?? data;
  if (!group || group.host !== user.email) return notFound();
  return (
    <div className="mx-auto max-w-4xl">
      <GroupSettingsClient initialGroup={group} />
    </div>
  );
}
