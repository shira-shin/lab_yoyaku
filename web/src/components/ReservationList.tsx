import React from 'react';
import { APP_TZ, formatInTZ } from '@/lib/time';

export type ReservationItem = {
  id: string;
  deviceName: string;
  user: string;
  start: Date;
  end: Date;
};

const fmt = (d: Date) =>
  formatInTZ(d, APP_TZ, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

export default function ReservationList({ items }: { items: ReservationItem[] }) {
  if (!items.length) return <p className="text-sm text-neutral-500">予約がありません。</p>;
  const now = Date.now();
  return (
    <ul className="list-disc pl-5 space-y-1 text-sm">
      {items.map((i) => {
        const isPast = i.end.getTime() < now;
        return (
          <li
            key={i.id}
            className={isPast ? 'text-gray-400 opacity-60' : undefined}
          >
            {`機器: ${i.deviceName} / 予約者: ${i.user} / 時間: ${fmt(i.start)} - ${fmt(i.end)}`}
          </li>
        );
      })}
    </ul>
  );
}
