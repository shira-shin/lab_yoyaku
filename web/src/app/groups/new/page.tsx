export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'default-no-store';

import { redirect } from 'next/navigation';
import { getUserFromCookies } from '@/lib/auth/server';
import NewGroupForm from './NewGroupForm';

export default async function NewGroupPage() {
  const user = await getUserFromCookies();
  if (!user) redirect('/login?next=/groups/new');
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">グループ作成</h1>
        <a href="/" className="btn btn-secondary">ホームに戻る</a>
      </div>
      <NewGroupForm />
    </div>
  );
}
