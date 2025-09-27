export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/http/serverFetch';
import GroupScreenClient from './GroupScreenClient';
import Link from 'next/link';
import { prisma } from '@/src/lib/prisma';
import type { Span } from '@/components/CalendarWithBars';
import PrintButton from '@/components/PrintButton';
import type { ReservationItem } from '@/components/ReservationList';
import CalendarReservationSection from './CalendarReservationSection';
import Image from 'next/image';
import { AUTH_COOKIE } from '@/lib/auth/cookies';
import { decodeSession } from '@/lib/auth';
import { unstable_noStore as noStore } from 'next/cache';

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

type ReservationResponse = {
  id: string;
  deviceId: string;
  deviceSlug: string;
  deviceName: string;
  start: string;
  end: string;
  purpose: string | null;
  userEmail: string;
  userName: string;
};

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { month?: string };
}) {
  noStore();
  const paramSlug = params.slug.toLowerCase();
  const token = cookies().get(AUTH_COOKIE)?.value;
  let user: Awaited<ReturnType<typeof decodeSession>> | null = null;
  if (token) {
    try {
      user = await decodeSession(token);
    } catch {
      user = null;
    }
  }

  if (!user) redirect(`/login?next=/groups/${encodeURIComponent(paramSlug)}`);

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

  const isMember =
    groupRecord.hostEmail === user.email ||
    groupRecord.members.some((member) => member.email === user.email);

  if (!isMember) {
    redirect(`/groups/join?slug=${encodeURIComponent(paramSlug)}`);
  }

  const canLeave = isMember && groupRecord.hostEmail !== user.email;

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

  const reservationParams = new URLSearchParams({
    groupSlug: group.slug,
    from: rangeStart.toISOString(),
    to: rangeEnd.toISOString(),
  });
  const reservationsRes = await serverFetch(`/api/reservations?${reservationParams.toString()}`);
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
  const reservations: ReservationResponse[] = Array.isArray(reservationsJson?.reservations)
    ? reservationsJson.reservations
    : [];
  const nameOf = (r: any) => {
    if (me && r.userEmail === me.email) return me.name || me.email.split('@')[0];
    return r.userName || r.userEmail?.split('@')[0] || r.userName || '';
  };

  const spans: Span[] = reservations.map((r) => {
    const dev = devices.find((d: any) => d.id === r.deviceId || d.slug === r.deviceSlug);
    return {
      id: r.id,
      name: dev?.name ?? r.deviceName ?? r.deviceId,
      start: new Date(r.start),
      end: new Date(r.end),
      color: colorFromString(r.deviceId),
      groupSlug: group.slug,
      by: nameOf(r),
    };
  });

  const listItems: ReservationItem[] = reservations.map((r) => {
    const dev = devices.find((d: any) => d.id === r.deviceId || d.slug === r.deviceSlug);
    return {
      id: r.id,
      deviceName: dev?.name ?? r.deviceName ?? r.deviceId,
      user: nameOf(r),
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
          </div>
        </div>
        <CalendarReservationSection
          weeks={weeks}
          month={month}
          spans={spans}
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
