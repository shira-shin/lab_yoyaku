import { serverFetch } from '@/lib/server-fetch';
import { readUserFromCookie } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import GroupSettingsClient from './GroupSettingsClient';

export const dynamic = 'force-dynamic';

export default async function GroupSettingsPage({ params }: { params: { slug: string } }) {
  const slug = params.slug.toLowerCase();
  const res = await serverFetch(`/api/mock/groups/${encodeURIComponent(slug)}`);
  if (res.status === 401) redirect(`/login?next=/groups/${slug}/settings`);
  if (res.status === 404) return notFound();
  if (!res.ok) throw new Error(`failed: ${res.status}`);
  const data = await res.json();
  const group = data?.data ?? data;
  const me = await readUserFromCookie();
  if (!me || group.host !== me.email) return notFound();
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <GroupSettingsClient initialGroup={group} />
    </div>
  );
}
