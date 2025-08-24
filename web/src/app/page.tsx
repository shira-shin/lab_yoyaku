import { readUserFromCookie } from '@/lib/auth';

const card =
  'rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow transition';

export default async function Home() {
  const me = await readUserFromCookie();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className={card}>
          <div className="text-sm text-gray-500">ようこそ</div>
          <div className="mt-1 font-medium">{me?.name || me?.email}</div>
        </div>
        <a href="/groups" className={card}>
          <div className="font-medium">グループ</div>
          <div className="text-sm text-gray-500 mt-1">作成 / 参加 / 一覧</div>
        </a>
        <a href="/groups/new" className={card}>
          <div className="font-medium">新しいグループ</div>
          <div className="text-sm text-gray-500 mt-1">すぐに立ち上げ</div>
        </a>
      </div>
    </div>
  );
}
