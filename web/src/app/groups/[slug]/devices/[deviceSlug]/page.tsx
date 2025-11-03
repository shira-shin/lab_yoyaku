export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { serverFetch } from '@/lib/http/serverFetch';
import { dayRangeInUtc, utcToLocal } from '@/lib/time';
import {
  extractReservationItems,
  normalizeReservation,
  overlapsRange,
  type NormalizedReservation,
} from '@/lib/reservations';
import { unstable_noStore as noStore } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import CalendarWithBars, { Span } from '@/components/CalendarWithBars';
import PrintButton from '@/components/PrintButton';
import Image from 'next/image';
import BackButton from '@/components/BackButton';
import ReservationPanel from '@/components/reservations/ReservationPanel';
import type { ReservationListItem } from '@/components/reservations/ReservationList';
import { getUserFromCookies } from '@/lib/auth/server';
import CopyableCode from '@/components/CopyableCode';

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

export default async function DeviceDetail({
  params,
  searchParams,
}: {
  params: { slug: string; deviceSlug: string };
  searchParams: { month?: string };
}) {
  noStore();
  const { slug, deviceSlug } = params;
  const group = slug;
  const user = await getUserFromCookies();
  if (!user) redirect(`/login?next=/groups/${group}/devices/${deviceSlug}`);
  const res = await serverFetch(
    `/api/groups/${encodeURIComponent(group)}/devices/${encodeURIComponent(deviceSlug)}`
  );
  if (res.status === 401) redirect(`/login?next=/groups/${group}/devices/${deviceSlug}`);
  if (res.status === 403) redirect(`/groups/join?slug=${encodeURIComponent(group)}`);
  if (res.status === 404) return notFound();
  if (!res.ok) throw new Error('機器の詳細を取得できませんでした');
  const json = await res.json();
  const dev = json?.device;
  const deviceCode: string | null = dev?.code ?? null;
  const me = user;

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
  const rangeStart = new Date(weeks[0][0]);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(weeks[weeks.length - 1][6]);
  rangeEnd.setHours(0, 0, 0, 0);
  rangeEnd.setDate(rangeEnd.getDate() + 1);
  const toYmd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const { dayStartUtc: rangeStartBoundaryUtc } = dayRangeInUtc(toYmd(rangeStart));
  const { dayEndUtc: rangeEndBoundaryUtc } = dayRangeInUtc(
    toYmd(new Date(rangeEnd.getTime() - 24 * 60 * 60 * 1000)),
  );
  const rangeStartBoundary = utcToLocal(rangeStartBoundaryUtc);
  const rangeEndBoundary = utcToLocal(rangeEndBoundaryUtc);

  const reservationsParams = new URLSearchParams({
    deviceSlug,
    from: rangeStartBoundaryUtc.toISOString(),
    to: rangeEndBoundaryUtc.toISOString(),
  });
  const reservationsRes = await serverFetch(
    `/api/groups/${encodeURIComponent(group)}/reservations?${reservationsParams.toString()}`,
    { cache: 'no-store', next: { revalidate: 0 } },
  );
  if (reservationsRes.status === 401) {
    redirect(`/login?next=/groups/${group}/devices/${deviceSlug}`);
  }
  if (reservationsRes.status === 403) {
    redirect(`/groups/join?slug=${encodeURIComponent(group)}`);
  }
  if (reservationsRes.status === 404) {
    return notFound();
  }
  if (!reservationsRes.ok) {
    throw new Error('予約情報の取得に失敗しました');
  }
  const reservationsJson = await reservationsRes.json();
  const reservationItems = extractReservationItems(reservationsJson);
  const reservations = reservationItems
    .map((item) => normalizeReservation(item))
    .filter((item): item is NormalizedReservation => Boolean(item))
    .filter((reservation) => overlapsRange(reservation, rangeStartBoundary, rangeEndBoundary));
  const nameOf = (r: NormalizedReservation) => {
    const email = r.user?.email ?? r.userEmail ?? undefined;
    if (me && email && email === me.email) {
      return me.name || email.split('@')[0];
    }
    return r.user?.name || r.userName || (email ? email.split('@')[0] : '');
  };

  const spans: Span[] = reservations.map((r) => {
    const deviceName = dev?.name ?? r.deviceName ?? r.deviceId;
    return {
      id: r.id,
      name: deviceName,
      startsAtUTC: r.startsAtUTC,
      endsAtUTC: r.endsAtUTC,
      start: r.start,
      end: r.end,
      groupSlug: group,
      by: nameOf(r),
      device: { id: r.deviceId, name: deviceName },
    } satisfies Span;
  });

  const listItems: ReservationListItem[] = reservations
    .map((r) => {
      const deviceName = dev?.name ?? r.deviceName ?? r.deviceId;
      return {
        id: r.id,
        device: { id: r.deviceId, name: deviceName },
        user: { name: nameOf(r) },
        startsAtUTC: r.startsAtUTC,
        endsAtUTC: r.endsAtUTC,
      } satisfies ReservationListItem;
    })
    .sort(
      (a, b) => new Date(a.startsAtUTC).getTime() - new Date(b.startsAtUTC).getTime(),
    );

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="print:hidden flex gap-4 mb-4">
        <BackButton className="text-blue-600 hover:underline" />
        <a href="/" className="text-blue-600 hover:underline">ホーム</a>
        <a
          href={`/groups/${encodeURIComponent(group)}`}
          className="text-blue-600 hover:underline"
        >
          グループページ
        </a>
      </div>
      <div className="rounded-2xl border p-4 md:p-6 bg-white relative space-y-4">
        <div className="flex justify-between items-center">
          <a
            href={`?month=${toParam(prev)}`}
            className="px-2 py-1 rounded border print:hidden"
          >
            ‹
          </a>
          <div className="flex-1 text-center font-medium">
            {dev?.name}　{year}年{month + 1}月
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`?month=${toParam(next)}`}
              className="px-2 py-1 rounded border print:hidden"
            >
              ›
            </a>
            <div className="print:hidden">
              <PrintButton className="btn btn-secondary" />
            </div>
          </div>
        </div>
        {deviceCode ? (
          <div className="print:hidden">
            <div className="text-sm font-medium text-gray-700">機器コード</div>
            <CopyableCode value={deviceCode} />
          </div>
        ) : null}
        <CalendarWithBars weeks={weeks} month={month} spans={spans} groupSlug={group} />
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">予約一覧</h2>
          <ReservationPanel items={listItems} />
        </div>
        <Image
          src={`/api/devices/${encodeURIComponent(deviceSlug)}/qr`}
          alt="QRコード"
          width={128}
          height={128}
          className="w-0 h-0 opacity-0 mt-4 ml-auto print:w-32 print:h-32 print:opacity-100 print:block print:fixed print:right-5 print:bottom-5"
        />
      </div>
    </div>
  );
}
