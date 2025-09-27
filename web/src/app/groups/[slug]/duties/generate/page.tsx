import Link from 'next/link';
import { serverFetch } from '@/lib/http/serverFetch';

export default async function GenerateDutiesPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;
  const groupRes = await serverFetch(`/api/groups/${encodeURIComponent(slug)}`);
  if (!groupRes.ok) {
    return <div className="mx-auto max-w-3xl p-6">権限がありません。</div>;
  }

  const [typesRes, membersRes] = await Promise.all([
    serverFetch(`/api/duty-types?groupSlug=${encodeURIComponent(slug)}`),
    serverFetch(`/api/groups/${encodeURIComponent(slug)}/members`),
  ]);

  const types = typesRes.ok ? await typesRes.json().catch(() => []) : [];
  const members = membersRes.ok ? await membersRes.json().catch(() => []) : [];

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">期間でまとめて作成</h1>
        <p className="text-sm text-gray-600">対象期間とメンバーを選んで一括で割り当てます。</p>
      </div>

      <form action="/api/duties/batch" method="post" className="space-y-4">
        <input type="hidden" name="groupSlug" value={slug} />

        <label className="block space-y-1">
          <span className="text-sm font-medium">種類</span>
          <select
            name="dutyTypeId"
            required
            defaultValue=""
            className="w-full rounded border px-3 py-2"
          >
            <option value="" disabled hidden>
              選択してください
            </option>
            {Array.isArray(types)
              ? types.map((type: any) => (
                  <option key={type.id} value={type.id}>
                    {type.name ?? '名称未設定'}
                  </option>
                ))
              : null}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium">開始日</span>
            <input type="date" name="from" required className="w-full rounded border px-3 py-2" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">終了日</span>
            <input type="date" name="to" required className="w-full rounded border px-3 py-2" />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">方式</span>
          <select name="mode" required defaultValue="ROUND_ROBIN" className="w-full rounded border px-3 py-2">
            <option value="ROUND_ROBIN">ラウンドロビン</option>
            <option value="RANDOM">ランダム</option>
            <option value="MANUAL">手動（雛形のみ作成）</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">対象メンバー（Ctrl/⌘で複数選択）</span>
          <select
            name="memberIds"
            multiple
            size={6}
            className="w-full rounded border px-3 py-2"
          >
            {Array.isArray(members)
              ? members
                  .filter((member: any) => member?.id && member?.email)
                  .map((member: any) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName || member.email}
                    </option>
                  ))
              : null}
          </select>
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">対象曜日（省略時は毎日）</legend>
          <div className="flex flex-wrap gap-3">
            {['日', '月', '火', '水', '木', '金', '土'].map((label, index) => (
              <label key={index} className="flex items-center gap-1 text-sm">
                <input type="checkbox" name="weekdays" value={index} className="rounded" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700">
          プレビュー＆作成
        </button>
      </form>

      <p>
        <Link
          href={`/groups/${encodeURIComponent(slug)}/duties`}
          className="text-indigo-600 hover:underline"
        >
          ← 戻る
        </Link>
      </p>
    </div>
  );
}
