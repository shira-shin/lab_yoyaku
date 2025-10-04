'use client';

import { useMemo, useState } from 'react';
import { deviceColor, deviceColorSoft } from '@/lib/color';
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
          const startDateLabel = formatUtcInAppTz(r.startsAtUTC, { month: 'numeric', day: 'numeric' });
          const startTimeLabel = formatUtcInAppTz(r.startsAtUTC, { hour: '2-digit', minute: '2-digit' });
          const endLabel = formatUtcInAppTz(r.endsAtUTC, {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          const userName = r.user.name ?? '（予約者不明）';
          return (
            <li
              key={r.id}
              className="rounded-2xl border overflow-hidden"
              style={{
                background: deviceColorSoft(r.device.id),
                borderColor: deviceColor(r.device.id),
              }}
            >
              <div
                className="flex items-center justify-between px-3 py-2"
                style={{ background: deviceColor(r.device.id), color: 'white' }}
              >
                <div className="font-semibold">{r.device.name}</div>
                <div className="text-xs opacity-90">ID: {r.id.slice(0, 8)}…</div>
              </div>
              <div className={`px-4 py-3 ${past ? 'opacity-50' : ''}`}>
                <div className="text-lg font-bold leading-tight">
                  {startDateLabel} {startTimeLabel} → {endLabel}
                </div>
                <div className="mt-1 text-base">
                  予約者：<span className="font-medium">{userName}</span>
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
