import { serverFetch } from '@/lib/server-fetch';
import { redirect } from 'next/navigation';
import ProfileClient from './ProfileClient';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const res = await serverFetch('/api/me/profile');
  if (res.status === 401) redirect('/login?next=/account/profile');
  const json = await res.json();
  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-bold">プロフィール</h1>
      <ProfileClient initialDisplayName={json?.displayName ?? ''} />
    </div>
  );
}
