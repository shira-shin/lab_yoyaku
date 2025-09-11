import { serverGet } from '@/lib/server-api';
import { readUserFromCookie } from '@/lib/auth';
import { notFound } from 'next/navigation';
import GroupSettingsClient from './GroupSettingsClient';

export const dynamic = 'force-dynamic';

export default async function GroupSettingsPage({ params }: { params: { slug: string } }) {
  const res = await serverGet<{ data: any }>(`/api/mock/groups/${params.slug}`);
  const group = res?.data;
  if (!group) return notFound();
  const me = await readUserFromCookie();
  if (!me || group.host !== me.email) return notFound();
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <GroupSettingsClient initialGroup={group} />
    </div>
  );
}
