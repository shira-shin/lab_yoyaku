import React from 'react';
import { formatJp } from '@/lib/time';

export type ReservationItem = {
  id: string;
  deviceName: string;
  user: string;
  start: Date;
  end: Date;
};

function fmt(d: Date) {
  return formatJp(d);
}

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
