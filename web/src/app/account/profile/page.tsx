export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { redirect } from 'next/navigation';
import { getUserFromCookies } from '@/lib/auth/server';
import { serverFetch } from '@/lib/serverFetch';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  const user = await getUserFromCookies();
  if (!user) redirect('/login?next=/account/profile');
  const res = await serverFetch('/api/me/profile');
  if (res.status === 401) {
    redirect('/login?next=/account/profile');
  }
  if (!res.ok) {
    redirect('/login?next=/account/profile');
  }
  const json = await res.json();
  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-bold">プロフィール</h1>
      <ProfileClient
        initialDisplayName={json?.displayName ?? ''}
        email={json?.email ?? ''}
      />
    </div>
  );
}
