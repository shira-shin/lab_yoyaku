'use client';

import { useMemo, useState } from 'react';
import { deviceBg, deviceBgPast, deviceColor } from '@/lib/color';
import {
  APP_TZ,
  formatUtcInAppTz,
  isPastUtc,
  overlapsLocalDay,
  utcIsoToLocalDate,
} from '@/lib/time';
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

  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('ja-JP', {
        timeZone: APP_TZ,
        month: 'numeric',
        day: 'numeric',
      }),
    [],
  );

  const weekdayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('ja-JP', {
        timeZone: APP_TZ,
        weekday: 'long',
      }),
    [],
  );

  const groups = useMemo(() => {
    const byDate = new Map<
      string,
      {
        key: string;
        label: string;
        weekday: string;
        reservations: ReservationListItem[];
      }
    >();
    const pad = (n: number) => n.toString().padStart(2, '0');
    filtered.forEach((reservation) => {
      const startLocal = utcIsoToLocalDate(reservation.startsAtUTC);
      const key = `${startLocal.getFullYear()}-${pad(startLocal.getMonth() + 1)}-${pad(startLocal.getDate())}`;
      const existing = byDate.get(key);
      if (existing) {
        existing.reservations.push(reservation);
        return;
      }
      byDate.set(key, {
        key,
        label: dayFormatter.format(startLocal),
        weekday: weekdayFormatter.format(startLocal),
        reservations: [reservation],
      });
    });
    const toEpoch = (key: string) => {
      const [y, m, d] = key.split('-').map(Number);
      return new Date(y, (m ?? 1) - 1, d ?? 1).getTime();
    };
    return Array.from(byDate.values()).sort(
      (a, b) => toEpoch(a.key) - toEpoch(b.key),
    );
  }, [dayFormatter, filtered, weekdayFormatter]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={device}
          onChange={(e) => setDevice(e.target.value)}
          className="border rounded px-3 py-2 text-sm sm:text-base"
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
          className="border rounded px-3 py-2 text-sm sm:text-base sm:flex-1"
        />
      </div>

      <div className="space-y-4">
        {groups.map((group) => {
          const { reservations, label, weekday } = group;
          return (
            <section
              key={group.key}
              className="rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex flex-col gap-1 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xl font-bold text-gray-900 sm:text-2xl">{label}</p>
                  <p className="text-xs text-gray-500">{weekday}</p>
                </div>
                <span className="text-xs font-medium text-gray-500 sm:text-sm">
                  {reservations.length}件の予約
                </span>
              </div>
              <ul className="space-y-3 px-4 py-3">
                {reservations.map((r) => {
                  const past = isPastUtc(r.endsAtUTC);
                  const bg = past ? deviceBgPast(r.device.id) : deviceBg(r.device.id);
                  const bar = deviceColor(r.device.id);
                  const userName = r.user.name ?? '（予約者不明）';
                  const startLocal = utcIsoToLocalDate(r.startsAtUTC);
                  const endLocal = utcIsoToLocalDate(r.endsAtUTC);
                  const sameDay =
                    startLocal.getFullYear() === endLocal.getFullYear() &&
                    startLocal.getMonth() === endLocal.getMonth() &&
                    startLocal.getDate() === endLocal.getDate();
                  const startLabel = formatUtcInAppTz(r.startsAtUTC, {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const endLabel = sameDay
                    ? formatUtcInAppTz(r.endsAtUTC, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : formatUtcInAppTz(r.endsAtUTC, {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                  return (
                    <li
                      key={r.id}
                      className="rounded-xl border border-white/40 bg-white/60 p-4 shadow-sm backdrop-blur"
                      style={{ background: bg, borderColor: bar }}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: bar }}
                          />
                          <span className={`text-base font-semibold text-gray-900 ${past ? 'opacity-60' : ''}`}>
                            {r.device.name}
                          </span>
                        </div>
                        <div className={`text-sm font-medium text-gray-700 ${past ? 'opacity-40' : ''}`}>
                          {startLabel} → {endLabel}
                        </div>
                      </div>
                      <div className={`mt-2 text-sm text-gray-800 ${past ? 'opacity-40' : ''}`}>
                        予約者：<span className="font-semibold">{userName}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {groups.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
            該当する予約はありません
          </div>
        )}
      </div>
    </section>
  );
}
