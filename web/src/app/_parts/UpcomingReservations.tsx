'use client';
import { useState } from 'react';

export type Item = {
  id: string;
  deviceId: string;
  deviceName?: string;
  start: string;
  end: string;
  purpose?: string;
  groupSlug: string;
  groupName: string;
};

function pad(n: number) {
  return n.toString().padStart(2, '0');
}
function fmtRange(s: string, e: string) {
  const S = new Date(s), E = new Date(e);
  const same = S.toDateString() === E.toDateString();
  const d = (x: Date) => `${x.getMonth() + 1}/${x.getDate()} ${pad(x.getHours())}:${pad(x.getMinutes())}`;
  return same
    ? `${d(S)}–${pad(E.getHours())}:${pad(E.getMinutes())}`
    : `${d(S)} → ${d(E)}`;
}
function colorFromString(s: string) {
  const palette = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#7c3aed', '#0ea5e9', '#f97316', '#14b8a6'];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export default function UpcomingReservations({
  initialItems,
  onLoaded,
}: {
  initialItems: Item[];
  onLoaded?: (payload: any) => void;
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<Item | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/me/reservations', { cache: 'no-store' });
      const j = await r.json();
      const arr: Item[] = (j.data ?? []).sort((a: any, b: any) =>
        new Date(a.start).getTime() - new Date(b.start).getTime()
      ).slice(0, 10);
      setItems(arr);
      onLoaded?.(j);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium">直近の自分の予約</div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="border rounded px-3 py-1 text-sm"
            disabled={loading}
            aria-label="予約を更新"
            title="予約を更新"
          >
            {loading ? '更新中…' : '更新'}
          </button>
          <a className="text-sm text-gray-500 hover:underline" href="/groups">すべてのグループへ</a>
        </div>
      </div>

      {!items.length ? (
        <div className="text-gray-500 text-sm">直近の予約はありません。右上の「グループ参加」から始めましょう。</div>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border px-3 py-2 flex items-start gap-3 cursor-pointer"
              onClick={() => setSel(r)}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full mt-2"
                style={{ backgroundColor: colorFromString(r.deviceId) }}
              />
              <div className="flex-1">
                <div className="text-sm text-gray-600">
                  {fmtRange(r.start, r.end)}（{r.groupName}）
                </div>
                <div className="font-medium mt-0.5">機器：{r.deviceName ?? r.deviceId}</div>
                {r.purpose && (
                  <div className="text-sm text-gray-500">用途：{r.purpose}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {sel && (
        <Modal item={sel} onClose={() => setSel(null)} />
      )}
    </>
  );
}

function Modal({ item, onClose }: { item: Item; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg w-full max-w-lg p-5 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">予約の詳細</div>
          <button onClick={onClose} className="text-sm text-gray-500 hover:underline">
            閉じる
          </button>
        </div>
        <div className="text-sm">{fmtRange(item.start, item.end)}（{item.groupName}）</div>
        <div className="font-medium">機器：{item.deviceName ?? item.deviceId}</div>
        {item.purpose && (
          <div className="text-sm text-gray-600">用途：{item.purpose}</div>
        )}
        <a
          href={`/groups/${item.groupSlug}`}
          className="text-sm text-indigo-600 hover:underline inline-block mt-2"
        >
          グループページへ
        </a>
      </div>
    </div>
  );
}
