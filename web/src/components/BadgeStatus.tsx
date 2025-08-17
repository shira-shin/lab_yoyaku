'use client';
import clsx from 'clsx';

export default function BadgeStatus({ state }: { state: 'available' | 'reserved' | 'in_use' | 'maintenance' | 'out_of_service' }) {
  const label = { available: '空き', reserved: '予約済み', in_use: '使用中', maintenance: 'メンテ中', out_of_service: '停止中' };
  const color = {
    available: 'bg-green-100 text-green-700',
    reserved: 'bg-amber-100 text-amber-700',
    in_use: 'bg-blue-100 text-blue-700',
    maintenance: 'bg-red-100 text-red-700',
    out_of_service: 'bg-neutral-200 text-neutral-600',
  } as const;
  return <span className={clsx('inline-flex items-center rounded-2xl px-3 py-1 text-sm', color[state])}>{label[state]}</span>;
}
