import Link from 'next/link';
import { absUrl } from '@/lib/url';

async function getTypes(slug: string) {
  const res = await fetch(absUrl(`/api/groups/${encodeURIComponent(slug)}`), { cache: 'no-store' });
  if (!res.ok) {
    return [] as any[];
  }
  const json = await res.json().catch(() => ({} as any));
  const data = (json?.group ?? json?.data) as any;
  if (!data) return [];
  return Array.isArray(data.dutyTypes) ? data.dutyTypes : [];
}

export default async function DutiesPage({ params }: { params: { slug: string } }) {
  const types = await getTypes(params.slug);
  return (
    <div className="mx-auto max-w-5xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">当番・作業</h1>
        <div className="flex gap-2">
          <Link
            href={`/groups/${encodeURIComponent(params.slug)}/duties/new-type`}
            className="px-3 py-2 rounded bg-purple-600 text-white"
          >
            当番の種類を追加
          </Link>
          <Link
            href={`/groups/${encodeURIComponent(params.slug)}/duties/generate`}
            className="px-3 py-2 rounded bg-purple-100 text-purple-700 border"
          >
            期間生成
          </Link>
        </div>
      </div>

      <p className="text-sm text-gray-600">
        種類:{' '}
        {types.length
          ? types
              .map((t: any) => `${t.name ?? '名称未設定'}(${t.kind ?? 'DAY_SLOT'})`)
              .join(', ')
          : '未作成'}
      </p>
      <p className="text-gray-500">※まず「当番の種類」を作成 → 「期間生成」で自動割当できます。</p>
    </div>
  );
}
