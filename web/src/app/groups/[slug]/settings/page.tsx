export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

import { serverFetch } from '@/lib/http/serverFetch';
import { getUserFromCookies } from '@/lib/auth/server';
import { unstable_noStore as noStore } from 'next/cache';
import { redirect, notFound } from 'next/navigation';
import GroupSettingsClient from './GroupSettingsClient';

export default async function GroupSettingsPage({ params }: { params: { slug: string } }) {
  noStore();
  const slug = params.slug.toLowerCase();
  const user = await getUserFromCookies();
  const destination = `/groups/${slug}/settings`;
  const signInUrl = `/signin?callbackUrl=${encodeURIComponent(destination)}`;
  if (!user) redirect(signInUrl);
  const res = await serverFetch(`/api/groups/${encodeURIComponent(slug)}`);
  if (res.status === 401) {
    redirect(signInUrl);
  }
  if (res.status === 403) {
    redirect(`/groups/join?slug=${encodeURIComponent(slug)}`);
  }
  if (res.status === 404) return notFound();
  if (!res.ok) {
    redirect(signInUrl);
  }
  const data = await res.json();
  const group = data?.group ?? data;
  if (!group || group.host !== user.email) return notFound();
  return (
    <div className="mx-auto max-w-4xl">
      <GroupSettingsClient initialGroup={group} />
    </div>
  );
}
