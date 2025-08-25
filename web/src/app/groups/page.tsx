import Link from "next/link";
import { listGroups } from '@/lib/server-api';

export default async function GroupsPage() {
  const res = await listGroups();
  const groups = res.data || [];
  return (
    <main className="mx-auto max-w-6xl px-6 py-8 space-y-4">
      <h1 className="text-2xl font-bold">グループ一覧</h1>
      <ul className="list-disc pl-5 space-y-1">
        {groups.map((g:any)=>(
          <li key={g.slug}><Link href={`/groups/${g.slug}`} className="text-blue-600 hover:underline">{g.name}</Link></li>
        ))}
      </ul>
    </main>
  );
}
