import Link from 'next/link';
import { serverFetch } from '@/lib/http/serverFetch';
import DutiesManager from './DutiesManager';

type DutyTypeSummary = { id: string; name: string };
type MemberSummary = { id: string; displayName: string; email?: string };

async function fetchDutyTypes(slug: string): Promise<DutyTypeSummary[]> {
  try {
    const res = await serverFetch(`/api/groups/${encodeURIComponent(slug)}`);
    if (!res.ok) {
      return [];
    }
    const json = await res.json().catch(() => ({} as any));
    const data = (json?.group ?? json?.data) as any;
    if (!data?.dutyTypes) return [];
    return (Array.isArray(data.dutyTypes) ? data.dutyTypes : [])
      .map((type: any) => ({ id: type.id ?? '', name: type.name ?? '名称未設定' }))
      .filter((type) => type.id);
  } catch {
    return [];
  }
}

async function fetchMembers(slug: string): Promise<MemberSummary[]> {
  try {
    const res = await serverFetch(`/api/groups/${encodeURIComponent(slug)}/members`);
    if (!res.ok) {
      return [];
    }
    const json = await res.json().catch(() => [] as any[]);
    if (!Array.isArray(json)) return [];
    return json
      .map((item: any) => ({
        id: item.id ?? '',
        displayName: item.displayName ?? item.email ?? '',
        email: item.email ?? undefined,
      }))
      .filter((item) => item.id && item.displayName);
  } catch {
    return [];
  }
}

export default async function DutiesPage({ params }: { params: { slug: string } }) {
  const [types, members] = await Promise.all([
    fetchDutyTypes(params.slug),
    fetchMembers(params.slug),
  ]);

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
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

      <div className="space-y-2 text-sm text-gray-600">
        <p>
          種類:{' '}
          {types.length
            ? types.map((type) => type.name).join(', ')
            : '未作成'}
        </p>
        <p className="text-gray-500">
          単発追加と週次ルールを使って、当番枠をまとめて登録できます。
        </p>
      </div>

      <DutiesManager groupSlug={params.slug} dutyTypes={types} members={members} />
    </div>
  );
}
