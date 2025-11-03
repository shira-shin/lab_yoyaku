export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';
import { getUserFromCookies } from '@/lib/auth/server';
import { serverFetch } from '@/lib/http/serverFetch';
import Empty from '@/components/Empty';
import { Button } from '@/components/ui/Button';

export default async function GroupsPage() {
  noStore();
  const user = await getUserFromCookies();
  if (!user) redirect('/login?next=/groups');
  let groups: any[] = [];
  let loadError = false;
  try {
    const res = await serverFetch('/api/groups?mine=1');
    if (res.status === 401) redirect('/login?next=/groups');
    if (res.ok) {
      const data = await res.json();
      groups = Array.isArray(data) ? data : data?.groups ?? [];
    } else {
      loadError = true;
      console.error('failed to load /api/groups?mine=1', res.status);
    }
  } catch (error) {
    loadError = true;
    console.error('failed to load /api/groups?mine=1', error);
  }

  const header = (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">グループ一覧</h1>
      <div className="flex gap-2">
        <Button href="/groups/new" variant="primary" size="sm">
          グループをつくる
        </Button>
        <Button href="/" variant="ghost" size="sm">
          ホームに戻る
        </Button>
      </div>
    </div>
  );

  if (loadError) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        {header}
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          グループ情報の取得に失敗しました。時間をおいて再度お試しください。
        </div>
      </div>
    );
  }

  if (groups.length === 0)
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        {header}
        <Empty>まだグループがありません。右上から作成/参加しましょう。</Empty>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {header}
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
