import Link from "next/link";
import { serverGet } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
  const groups = (await serverGet<any[]>('/api/mock/groups')) ?? [];
  return (
    <main className="mx-auto max-w-6xl px-6 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">グループ一覧</h1>
        <div className="flex gap-2">
          <a href="/groups/new" className="rounded-lg border px-3 py-2 bg-indigo-600 text-white hover:bg-indigo-500">グループをつくる</a>
          <a href="/" className="rounded-lg border px-3 py-2 hover:bg-gray-100">ホームに戻る</a>
        </div>
      </div>
      <ul className="list-disc pl-5 space-y-1">
        {groups.map((g:any)=>(
          <li key={g.slug}><Link href={`/groups/${g.slug}`} className="text-blue-600 hover:underline">{g.name}</Link></li>
        ))}
      </ul>
    </main>
  );
}
