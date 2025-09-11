import { redirect } from 'next/navigation';
import { serverFetch } from '@/lib/server-fetch';
import NewGroupForm from './NewGroupForm';

export const dynamic = 'force-dynamic';

export default async function NewGroupPage() {
  const me = await serverFetch('/api/auth/me');
  if (me.status === 401) redirect('/login?next=/groups/new');
  return (
    <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">グループ作成</h1>
        <a href="/" className="btn btn-secondary">ホームに戻る</a>
      </div>
      <NewGroupForm />
    </main>
  );
}
