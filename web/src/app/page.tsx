import { readUserFromCookie } from '@/lib/auth';

export default async function Home() {
  const me = await readUserFromCookie();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="font-semibold mb-1">ようこそ</div>
          <div className="text-gray-600 text-sm">{me?.name || me?.email}</div>
        </div>
        <a href="/groups" className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="font-semibold mb-1">グループ</div>
          <div className="text-gray-600 text-sm">作成 / 参加 / 一覧</div>
        </a>
        <a href="/groups/new" className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="font-semibold mb-1">新しいグループ</div>
          <div className="text-gray-600 text-sm">すぐに立ち上げ</div>
        </a>
      </div>
    </div>
  );
}
