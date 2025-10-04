'use client';

import { useMemo, useState } from 'react';
import { deviceBg, deviceBgPast, deviceColor } from '@/lib/color';
import { APP_TZ, formatUtcInAppTz, isPastUtc } from '@/lib/time';
import type { ReservationListItem } from './ReservationList';

export type { ReservationListItem } from './ReservationList';

const ymdFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function reservationMatchesDate(reservation: ReservationListItem, selectedYmd: string | null) {
  if (!selectedYmd) return true;
  const itemYmd = ymdFormatter.format(new Date(reservation.startsAtUTC));
  return itemYmd === selectedYmd;
}

export default function ReservationPanel({
  items,
  selectedDate,
}: {
  items: ReservationListItem[];
  selectedDate?: Date | null;
}) {
  const [q, setQ] = useState('');
  const [device, setDevice] = useState<string>('all');

  const devices = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((i) => {
      map.set(i.device.id, i.device.name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [items]);

  const selectedYmd = selectedDate ? ymdFormatter.format(selectedDate) : null;

  const filtered = items.filter((i) => {
    if (!reservationMatchesDate(i, selectedYmd)) return false;
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

      <ul className="space-y-2">
        {filtered.map((r) => {
          const past = isPastUtc(r.endsAtUTC);
          const bg = past ? deviceBgPast(r.device.id) : deviceBg(r.device.id);
          const bar = deviceColor(r.device.id);
          const userName = r.user.name ?? '（予約者不明）';
          return (
            <li
              key={r.id}
              className="rounded-xl border leading-tight"
              style={{ background: bg, borderColor: bar }}
            >
              <div className="flex items-center justify-between px-3 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: bar }}
                  />
                  <span className="font-medium text-sm truncate">{r.device.name}</span>
                </div>
                <div className={`text-xs ${past ? 'opacity-60' : ''}`}>
                  {formatUtcInAppTz(r.startsAtUTC)} → {formatUtcInAppTz(r.endsAtUTC)}
                </div>
              </div>
              <div className={`px-3 pb-2 text-sm ${past ? 'opacity-60' : ''}`}>
                予約者：<span className="font-semibold">{userName}</span>
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
