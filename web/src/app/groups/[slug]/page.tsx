import { api } from '@/lib/api';
import ErrorView from '@/components/ErrorView';
import type { Group, Member, Device } from '@/lib/types';

export default async function GroupDetail({ params: { slug } }: { params: { slug: string } }) {
  try {
    const g = await api<
      Group & {
        members: Member[];
        devices: Device[];
        counts: { members: number; devices: number };
      }
    >(`/api/mock/groups/${slug}`);
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-bold">{g.name}</h1>
        <div>
          <h2 className="text-lg font-semibold mt-4">機器</h2>
          <ul className="list-disc pl-5 space-y-1">
            {g.devices.map((d: any) => (
              <li key={d.id}>{d.name}</li>
            ))}
          </ul>
        </div>
      </main>
    );
  } catch (e: any) {
    const msg = (e?.message ?? '') as string;
    const isNotFound = /API 404/.test(msg) || /not found/.test(msg);
    return (
      <ErrorView
        title="エラーが発生しました"
        detail={
          isNotFound
            ? `グループ ${slug} が見つかりません。作成/参加が成功しているか確認してください。`
            : msg
        }
        retryHref="/groups"
      />
    );
  }
}
