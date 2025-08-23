import { api } from '@/lib/api';
import { DevicesSection, ReservationsSection } from './components';

export default async function GroupDetail({ params, searchParams }:{
  params: { slug: string }, searchParams: { [k: string]: string }
}) {
  const group = await api(`/api/mock/groups/${params.slug}`);
  const joined = searchParams?.joined === '1';

  return (
    <div className="mx-auto max-w-3xl py-8 px-4 space-y-8">
      {joined && <div className="rounded border bg-green-50 p-3">✅ 参加が完了しました</div>}
      <header>
        <h1 className="text-3xl font-bold">{group.name}</h1>
        <div className="text-sm text-gray-500">slug: <code>{group.slug}</code> / メンバー: {group.members?.length ?? 0}</div>
      </header>

      {/* 機器エリア */}
      <DevicesSection slug={group.slug} />

      {/* 予約エリア */}
      <ReservationsSection slug={group.slug} members={group.members} />
    </div>
  );
}
