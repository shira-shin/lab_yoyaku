'use client';

import { useMemo, useState } from 'react';
import { deviceBg, deviceBgPast, deviceColor } from '@/lib/color';
import { formatUtcInAppTz, isPastUtc, overlapsLocalDay, utcIsoToLocalDate } from '@/lib/time';
import type { ReservationListItem } from './ReservationList';

export type { ReservationListItem } from './ReservationList';

function reservationMatchesDate(reservation: ReservationListItem, selectedYmd: string | null) {
  if (!selectedYmd) return true;
  return overlapsLocalDay(reservation.startsAtUTC, reservation.endsAtUTC, selectedYmd);
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

  const selectedYmd = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : null;

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
          console.info('[tz-check]', {
            src: 'ReservationPanel',
            itemId: r.id,
            startUTC: r.startsAtUTC,
            startLocal: utcIsoToLocalDate(r.startsAtUTC),
            label: formatUtcInAppTz(r.startsAtUTC),
          });
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
                <div className={`text-xs ${past ? 'opacity-30' : ''}`}>
                  {formatUtcInAppTz(r.startsAtUTC, {
                    month: undefined,
                    day: undefined,
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  →{' '}
                  {formatUtcInAppTz(r.endsAtUTC, {
                    month: undefined,
                    day: undefined,
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
              <div className={`px-3 pb-2 text-sm ${past ? 'opacity-30' : ''}`}>
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
