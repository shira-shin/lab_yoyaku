import { notFound } from 'next/navigation';
import { MOCK_DEVICES } from '@/lib/mock';
import BadgeStatus from '@/components/BadgeStatus';

export default function DeviceDetail({ params }: { params: { uid: string } }) {
  const d = MOCK_DEVICES.find((x) => x.device_uid === decodeURIComponent(params.uid));
  if (!d) return notFound();
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{d.name}</h1>
        <BadgeStatus state={d.status} />
      </div>
      <div className="mt-4 space-y-1 text-neutral-700">
        <div>UID: {d.device_uid}</div>
        <div>
          カテゴリ: {d.category} ／ 位置: {d.location}
        </div>
        <div>SOP バージョン: v{d.sop_version}</div>
      </div>
      <div className="mt-6 flex gap-3">
        <button className="rounded-2xl border px-4 py-2">予約</button>
        <button className="rounded-2xl border px-4 py-2">使用開始</button>
        <button className="rounded-2xl border px-4 py-2">QRポスター</button>
      </div>
    </main>
  );
}
