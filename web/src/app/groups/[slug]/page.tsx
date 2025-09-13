import { redirect, notFound } from 'next/navigation';
import { serverFetch } from '@/lib/server-fetch';
import GroupScreenClient from './GroupScreenClient';
import Link from 'next/link';
import { readUserFromCookie } from '@/lib/auth';
import type { Span } from '@/components/CalendarWithBars';
import PrintButton from '@/components/PrintButton';
import type { ReservationItem } from '@/components/ReservationList';
import CalendarReservationSection from './CalendarReservationSection';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

function toArr<T>(v: T[] | Record<string, T> | null | undefined): T[] {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') return Object.values(v as Record<string, T>);
  return [];
}
function buildMonth(base = new Date()) {
  const y = base.getFullYear(), m = base.getMonth();
  const first = new Date(y, m, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let i = 0; i < 7; i++) {
      row.push(new Date(start));
      start.setDate(start.getDate() + 1);
    }
    weeks.push(row);
  }
  return { weeks, month: m, year: y };
}
function colorFromString(s: string) {
  const palette = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#7c3aed', '#0ea5e9', '#f97316', '#14b8a6'];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { month?: string };
}) {
  const paramSlug = params.slug.toLowerCase();

  const res = await serverFetch(`/api/mock/groups/${encodeURIComponent(paramSlug)}`);
  if (res.status === 401) redirect(`/login?next=/groups/${paramSlug}`);
  if (res.status === 404) return notFound();
  if (!res.ok) throw new Error(`failed: ${res.status}`);
  const data = await res.json();
  const raw = data?.data ?? data?.group ?? data;
  const group = {
    ...raw,
    slug: raw?.slug ?? paramSlug,
    members: toArr(raw?.members),
    devices: toArr(raw?.devices),
    reservations: toArr(raw?.reservations),
  };
  const devices = group.devices;
  const reservationList = group.reservations;
  const me = await readUserFromCookie();
  const qrUrl = `/api/mock/groups/${encodeURIComponent(paramSlug)}/qr`;

  const baseMonth = (() => {
    if (searchParams?.month) {
      const [y, m] = searchParams.month.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) return new Date(y, m - 1, 1);
    }
    return new Date();
  })();
  const { weeks, month, year } = buildMonth(baseMonth);
  const prev = new Date(baseMonth);
  prev.setMonth(prev.getMonth() - 1);
  const next = new Date(baseMonth);
  next.setMonth(next.getMonth() + 1);
  const pad2 = (n: number) => n.toString().padStart(2, '0');
  const toParam = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  const spans: Span[] = reservationList.map((r: any) => {
    const dev = devices.find((d: any) => d.id === r.deviceId);
    return {
      id: r.id,
      name: dev?.name ?? r.deviceId,
      start: new Date(r.start),
      end: new Date(r.end),
      color: colorFromString(r.deviceId),
      groupSlug: group.slug,
      by: r.userName || r.user,
      participants: r.participants ?? [],
    };
  });

  const listItems: ReservationItem[] = reservationList.map((r: any) => {
    const dev = devices.find((d: any) => d.id === r.deviceId);
    return {
      id: r.id,
      deviceName: dev?.name ?? r.deviceId,
      user: r.userName || r.user,
      start: new Date(r.start),
      end: new Date(r.end),
    };
  });

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="print:hidden">
        <GroupScreenClient
          initialGroup={group}
          initialDevices={devices}
          defaultReserver={me?.email}
        />
      </div>
      <div className="rounded-2xl border p-4 md:p-6 bg-white space-y-4 overflow-visible">
        <div className="flex justify-between items-center">
          <a
            href={`?month=${toParam(prev)}`}
            className="px-2 py-1 rounded border print:hidden"
          >
            ‹
          </a>
          <div className="flex-1 text-center font-medium">{group.name}　{year}年{month + 1}月</div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={`?month=${toParam(next)}`}
              className="px-2 py-1 rounded border print:hidden"
            >
              ›
            </a>
            <div className="print:hidden">
              <PrintButton className="btn btn-secondary" />
            </div>
            <Link
              href={`/groups/${encodeURIComponent(group.slug)}/reservations/new${
                devices.length === 1
                  ? `?device=${encodeURIComponent(devices[0].slug)}`
                  : ''
              }`}
              className="btn btn-primary"
            >
              予約を追加
            </Link>
          </div>
        </div>
        <CalendarReservationSection
          weeks={weeks}
          month={month}
          spans={spans}
          listItems={listItems}
          groupSlug={group.slug}
          devices={devices}
          defaultReserver={me?.email}
        />
        <Image
          src={qrUrl}
          alt="QRコード"
          width={128}
          height={128}
          className="w-0 h-0 opacity-0 mt-4 ml-auto print:w-32 print:h-32 print:opacity-100 print:block print:fixed print:right-5 print:bottom-5"
        />
      </div>
    </div>
  );
}
