import { getBaseUrl } from '@/lib/base-url';
import { readUserFromCookie } from '@/lib/auth';
import { notFound } from 'next/navigation';
import GroupSettingsClient from './GroupSettingsClient';

export default async function GroupSettingsPage({ params }: { params: { slug: string } }) {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/mock/groups/${params.slug}`, { cache: 'no-store' });
  if (res.status === 404) return notFound();
  if (!res.ok) throw new Error(`API ${res.status} /api/mock/groups/${params.slug}`);
  const group = (await res.json()).data;
  const me = await readUserFromCookie();
  if (!me || group.host !== me.email) return notFound();
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <GroupSettingsClient initialGroup={group} />
    </div>
  );
}
