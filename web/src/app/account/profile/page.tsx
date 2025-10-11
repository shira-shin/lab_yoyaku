export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';
import { getUserFromCookies } from '@/lib/auth/server';
import { serverFetch } from '@/lib/http/serverFetch';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  noStore();
  const user = await getUserFromCookies();
  if (!user) redirect('/signin?callbackUrl=/account/profile');
  const res = await serverFetch('/api/me/profile');
  if (res.status === 401) {
    redirect('/signin?callbackUrl=/account/profile');
  }
  if (!res.ok) {
    redirect('/signin?callbackUrl=/account/profile');
  }
  const json = await res.json();
  const data = json?.data ?? null;
  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-bold">プロフィール</h1>
      <ProfileClient
        initialName={data?.name ?? user.name ?? ''}
        email={data?.email ?? user.email ?? ''}
      />
    </div>
  );
}
