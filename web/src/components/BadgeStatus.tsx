'use client';
import clsx from 'clsx';

export default function BadgeStatus({ state }: { state: 'available' | 'booked' | 'maintenance' }) {
  const label = { available: '空き', booked: '予約済み', maintenance: 'メンテ中' } as const;
  const color = {
    available: 'bg-green-100 text-green-700',
    booked: 'bg-amber-100 text-amber-700',
    maintenance: 'bg-red-100 text-red-700',
  } as const;
  return (
    <span className={clsx('inline-flex items-center rounded-2xl px-3 py-1 text-sm', color[state])}>
      {label[state]}
    </span>
  );
}
