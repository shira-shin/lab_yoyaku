export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { redirect } from 'next/navigation';
import { serverFetch } from '@/lib/http/serverFetch';
import { dayRangeInUtc, utcToLocal } from '@/lib/time';
import {
  extractReservationItems,
  normalizeReservation,
  overlapsRange,
  type NormalizedReservation,
} from '@/lib/reservations';
import GroupScreenClient from './GroupScreenClient';
import Link from 'next/link';
import { prisma } from '@/server/db/prisma';
import type { Span } from '@/components/CalendarWithBars';
import PrintButton from '@/components/PrintButton';
import type { ReservationListItem } from '@/components/reservations/ReservationList';
import CalendarReservationSection from './CalendarReservationSection';
import Image from 'next/image';
import { getAuthUser } from '@/lib/auth';
import { normalizeEmail } from '@/lib/email';
import { unstable_noStore as noStore } from 'next/cache';
import GroupHeader from './_components/GroupHeader';

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
export default async function GroupPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { month?: string };
}) {
  noStore();
  const paramSlug = params.slug.toLowerCase();
  const user = await getAuthUser();

  if (!user?.email) redirect(`/login?next=/groups/${encodeURIComponent(paramSlug)}`);

  const groupRecord = await prisma.group.findUnique({
    where: { slug: paramSlug },
    select: {
      id: true,
      slug: true,
      hostEmail: true,
      members: { select: { email: true } },
    },
  });

  if (!groupRecord) {
    redirect('/groups');
  }

  const normalizedUserEmail = normalizeEmail(user.email);
  const isMember =
    normalizeEmail(groupRecord.hostEmail ?? '') === normalizedUserEmail ||
    groupRecord.members.some((member) => normalizeEmail(member.email) === normalizedUserEmail);

  if (!isMember) {
    redirect(`/groups/join?slug=${encodeURIComponent(paramSlug)}`);
  }

  const canLeave =
    isMember && normalizeEmail(groupRecord.hostEmail ?? '') !== normalizedUserEmail;

  const res = await serverFetch(`/api/groups/${encodeURIComponent(paramSlug)}`);
  if (res.status === 401) redirect(`/login?next=/groups/${encodeURIComponent(paramSlug)}`);
  if (res.status === 403 || res.status === 404) {
    redirect(`/groups/join?slug=${encodeURIComponent(paramSlug)}`);
  }
  if (!res.ok) {
    redirect(`/login?next=/groups/${encodeURIComponent(paramSlug)}`);
  }
  const data = await res.json();
  const raw = data?.group ?? {};
  const group = {
    id: raw?.id,
    slug: raw?.slug ?? paramSlug,
    name: raw?.name ?? paramSlug,
    host: raw?.host ?? null,
    reserveFrom: raw?.reserveFrom ?? null,
    reserveTo: raw?.reserveTo ?? null,
    memo: raw?.memo ?? null,
    members: Array.isArray(raw?.members) ? raw.members : [],
    devices: Array.isArray(raw?.devices) ? raw.devices : [],
    reservations: Array.isArray(raw?.reservations) ? raw.reservations : [],
    deviceManagePolicy: raw?.deviceManagePolicy ?? 'HOST_ONLY',
    dutyManagePolicy: raw?.dutyManagePolicy ?? 'ADMINS_ONLY',
  };
  const devices = group.devices;
  const me = user;
  const qrUrl = `/api/groups/${encodeURIComponent(paramSlug)}/qr`;

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

  const reservationParams = new URLSearchParams({
    from: rangeStartBoundaryUtc.toISOString(),
    to: rangeEndBoundaryUtc.toISOString(),
  });

  const reservationsRes = await serverFetch(
    `/api/groups/${encodeURIComponent(paramSlug)}/reservations?${reservationParams.toString()}`,
    { cache: 'no-store', next: { revalidate: 0 } },
  );
  if (reservationsRes.status === 401) {
    redirect(`/login?next=/groups/${encodeURIComponent(paramSlug)}`);
  }
  if (reservationsRes.status === 403 || reservationsRes.status === 404) {
    redirect(`/groups/join?slug=${encodeURIComponent(paramSlug)}`);
  }
  if (!reservationsRes.ok) {
    redirect(`/login?next=/groups/${encodeURIComponent(paramSlug)}`);
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
    const dev = devices.find((d: any) => d.id === r.deviceId || d.slug === r.deviceSlug);
    const deviceId = dev?.id ?? r.deviceId;
    const deviceName = dev?.name ?? r.deviceName ?? r.deviceId;
    return {
      id: r.id,
      name: deviceName,
      startsAtUTC: r.startsAtUTC,
      endsAtUTC: r.endsAtUTC,
      start: r.start,
      end: r.end,
      groupSlug: group.slug,
      by: nameOf(r),
      device: { id: deviceId, name: deviceName },
    } satisfies Span;
  });

  const dutyParams = new URLSearchParams({
    groupSlug: group.slug,
    from: rangeStart.toISOString(),
    to: rangeEnd.toISOString(),
    include: 'type',
  });
  const dutiesRes = await serverFetch(`/api/duties?${dutyParams.toString()}`);
  if (dutiesRes.status === 401) {
    redirect(`/login?next=/groups/${encodeURIComponent(paramSlug)}`);
  }
  if (dutiesRes.status === 403 || dutiesRes.status === 404) {
    redirect(`/groups/join?slug=${encodeURIComponent(paramSlug)}`);
  }
  const dutiesJson = await dutiesRes.json().catch(() => ({}));
  const dutiesSource = Array.isArray(dutiesJson?.data)
    ? dutiesJson.data
    : Array.isArray(dutiesJson?.duties)
      ? dutiesJson.duties
      : [];
  const dutySpans: Span[] = dutiesSource.map((d: any) => {
    const date = new Date(d.date ?? d.startsAt ?? d.endsAt ?? Date.now());
    const start = d.startsAt ? new Date(d.startsAt) : new Date(date);
    if (!d.startsAt) {
      start.setUTCHours(0, 0, 0, 0);
    }
    const end = d.endsAt ? new Date(d.endsAt) : new Date(start);
    if (!d.endsAt) {
      end.setUTCHours(23, 59, 59, 999);
    }
    const type = d.type ?? {};
    const assignee = d.assignee ?? {};
    const assigneeName =
      assignee.name ||
      (assignee.email ? String(assignee.email).split('@')[0] : '') ||
      '未割当';
    return {
      id: `duty-${d.id}`,
      name: `[当番] ${type.name ?? '当番'}`,
      startsAtUTC: start.toISOString(),
      endsAtUTC: end.toISOString(),
      start,
      end,
      groupSlug: group.slug,
      by: assigneeName,
      color: type.color ?? '#7c3aed',
      device: null,
    } satisfies Span;
  });

  const calendarSpans = [...spans, ...dutySpans];

  const listItems: ReservationListItem[] = reservations
    .map((r) => {
      const dev = devices.find((d: any) => d.id === r.deviceId || d.slug === r.deviceSlug);
      const deviceId = dev?.id ?? r.deviceId;
      const deviceName = dev?.name ?? r.deviceName ?? r.deviceId;
      return {
        id: r.id,
        device: { id: deviceId, name: deviceName },
        user: { name: nameOf(r) },
        startsAtUTC: r.startsAtUTC,
        endsAtUTC: r.endsAtUTC,
      } satisfies ReservationListItem;
    })
    .sort(
      (a, b) => new Date(a.startsAtUTC).getTime() - new Date(b.startsAtUTC).getTime(),
    );

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <GroupHeader slug={group.slug} />
      <div className="print:hidden">
        <GroupScreenClient
          initialGroup={group}
          initialDevices={devices}
          defaultReserver={me?.email}
          canLeave={canLeave}
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
            <Link
              href={`/groups/${encodeURIComponent(group.slug)}/duties`}
              className="ml-2 px-3 py-2 rounded bg-purple-600 text-white"
            >
              当番・作業
            </Link>
          </div>
        </div>
        <CalendarReservationSection
          weeks={weeks}
          month={month}
          spans={calendarSpans}
          listItems={listItems}
          groupSlug={group.slug}
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
