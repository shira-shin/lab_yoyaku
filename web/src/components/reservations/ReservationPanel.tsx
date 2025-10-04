'use client';

import { useMemo, useState } from 'react';
import { deviceColor } from '@/lib/color';
import { formatUtcInAppTz } from '@/lib/time';
import type { ReservationListItem } from './ReservationList';

export type { ReservationListItem } from './ReservationList';

export default function ReservationPanel({ items }: { items: ReservationListItem[] }) {
  const [q, setQ] = useState('');
  const [device, setDevice] = useState<string>('all');

  const devices = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((i) => {
      map.set(i.device.id, i.device.name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [items]);

  const filtered = items.filter((i) => {
    const okDevice = device === 'all' || i.device.id === device;
    const userName = i.user.name ?? '';
    const hit =
      q === '' ||
      userName.includes(q) ||
      i.device.name.includes(q);
    return okDevice && hit;
  });

  return (
    <section className="space-y-3">
      <div className="flex gap-2 items-center">
        <select
          value={device}
          onChange={(e) => setDevice(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="all">すべての機器</option>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="機器名/予約者で検索"
          className="border rounded px-2 py-1 flex-1"
        />
      </div>

      <ul className="divide-y rounded-xl border">
        {filtered.map((r) => {
          const startLabel = formatUtcInAppTz(r.startsAtUTC, {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          const endLabel = formatUtcInAppTz(r.endsAtUTC, {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          const userName = r.user.name ?? '（予約者不明）';
          return (
            <li key={r.id} className="p-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ background: deviceColor(r.device.id) }}
                />
                <div className="text-sm">
                  <div className="font-medium">{r.device.name}</div>
                  <div className="text-gray-500">
                    {startLabel} → {endLabel}（{userName}）
                  </div>
                </div>
              </div>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="p-6 text-center text-gray-400 text-sm">
            該当する予約はありません
          </li>
        )}
      </ul>
    </section>
  );
}
