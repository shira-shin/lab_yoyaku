import Link from 'next/link';
import { serverFetch } from '@/lib/http/serverFetch';

export default async function NewDutyTypePage({
  params,
}: {
  params: { slug: string };
}) {
  const groupRes = await serverFetch(`/api/groups/${encodeURIComponent(params.slug)}`);
  if (!groupRes.ok) {
    return <div className="mx-auto max-w-2xl p-6">権限がありません。</div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">当番・作業の種類を追加</h1>
        <p className="text-sm text-gray-600">グループに新しい当番の種類を追加します。</p>
      </div>

      <form action="/api/duty-types" method="post" className="space-y-4">
        <input type="hidden" name="groupSlug" value={params.slug} />

        <label className="block space-y-1">
          <span className="text-sm font-medium">名称</span>
          <input
            name="name"
            required
            placeholder="例: 掃除当番"
            className="w-full rounded border px-3 py-2"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">説明（任意）</span>
          <input name="description" className="w-full rounded border px-3 py-2" />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">色（任意）</span>
          <input
            name="color"
            placeholder="#6c5ce7"
            className="w-full rounded border px-3 py-2"
          />
        </label>

        <button
          type="submit"
          className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
        >
          作成
        </button>
      </form>

      <p>
        <Link
          href={`/groups/${encodeURIComponent(params.slug)}/duties`}
          className="text-indigo-600 hover:underline"
        >
          ← 戻る
        </Link>
      </p>
    </div>
  );
}
