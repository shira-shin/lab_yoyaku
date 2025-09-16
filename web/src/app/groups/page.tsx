import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverFetch } from '@/lib/server-fetch';
import Empty from '@/components/Empty';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
  const res = await serverFetch('/api/groups?mine=1');
  if (res.status === 401) redirect('/login?next=/groups');
  if (!res.ok) throw new Error(`failed: ${res.status}`);
  const data = await res.json();
  const groups: any[] = Array.isArray(data) ? data : data?.groups ?? [];
  if (groups.length === 0)
    return <Empty>まだグループがありません。右上から作成/参加しましょう。</Empty>;
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">グループ一覧</h1>
        <div className="flex gap-2">
          <a href="/groups/new" className="btn btn-primary">グループをつくる</a>
          <a href="/" className="btn btn-secondary">ホームに戻る</a>
        </div>
      </div>
      <ul className="list-disc pl-5 space-y-1">
        {groups.map((g: any) => (
          <li key={g.slug}>
            <Link
              href={`/groups/${encodeURIComponent(g.slug.toLowerCase())}`}
              className="text-blue-600 hover:underline"
            >
              {g.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
