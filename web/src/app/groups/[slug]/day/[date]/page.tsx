export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { serverFetch } from '@/lib/http/serverFetch';
import { absUrl } from '@/lib/url';
import { dayRangeInUtc, utcToLocal } from '@/lib/time';
import {
  extractReservationItems,
  normalizeReservation,
  type NormalizedReservation,
} from '@/lib/reservations';
import { prisma } from '@/src/lib/prisma';
import DutyInlineEditor from './DutyInlineEditor';
import DutyInlineCreate from './DutyInlineCreate';
import InlineReservationForm from './InlineReservationForm';

function isValidDateFormat(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const pad = (value: number) => value.toString().padStart(2, '0');

function formatTime(value: Date) {
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

async function fetchDuties(slug: string, date: string) {
  const { dayStartUtc, dayEndUtc } = dayRangeInUtc(date);
  const from = dayStartUtc.toISOString();
  const to = dayEndUtc.toISOString();
  const res = await serverFetch(
    `/api/duties?groupSlug=${encodeURIComponent(slug)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&include=type`
  );
  if (!res.ok) {
    return [] as any[];
  }
  const json = await res.json().catch(() => ({}));
  if (Array.isArray(json?.data)) return json.data as any[];
  if (Array.isArray(json?.duties)) return json.duties as any[];
  return [] as any[];
}

export default async function DayPage({
  params,
}: {
  params: { slug: string; date: string };
}) {
  noStore();
  const { slug, date } = params;
  const normalizedSlug = slug.toLowerCase();
  if (!isValidDateFormat(date)) {
    notFound();
  }

  const reservationsRes = await fetch(
    absUrl(`/api/groups/${encodeURIComponent(normalizedSlug)}/reservations?date=${encodeURIComponent(date)}`),
    { cache: 'no-store', next: { revalidate: 0 } },
  );
    const devicesRes = await serverFetch(
      `/api/devices?groupSlug=${encodeURIComponent(normalizedSlug)}`,
      { cache: 'no-store', next: { revalidate: 0 } },
    );

  if (reservationsRes.status === 401 || devicesRes.status === 401) {
    redirect(`/login?next=/groups/${encodeURIComponent(normalizedSlug)}/day/${date}`);
  }
  if (devicesRes.status === 403 || devicesRes.status === 404) {
    redirect(`/groups/join?slug=${encodeURIComponent(normalizedSlug)}`);
  }
  if (!reservationsRes.ok) {
    throw new Error('予約情報の取得に失敗しました');
  }
  if (!devicesRes.ok) {
    throw new Error('機器情報の取得に失敗しました');
  }

  const payload = await reservationsRes.json().catch(() => ({}));
  const reservationItems = extractReservationItems(payload);
  const reservations = reservationItems
    .map((item) => normalizeReservation(item))
    .filter((item): item is NormalizedReservation => Boolean(item))
    .sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());

  const list = reservations.map((item) => {
    console.info('[render]', { raw: item.startsAtUTC, local: utcToLocal(item.startsAtUTC) });
    console.info('[render]', { raw: item.endsAtUTC, local: utcToLocal(item.endsAtUTC) });
    return {
      id: item.id,
      startUtc: item.startUtc,
      endUtc: item.endUtc,
      startLocal: item.start,
      endLocal: item.end,
      device: { name: item.deviceName ?? item.deviceId },
      startsAtUTC: item.startsAtUTC,
      endsAtUTC: item.endsAtUTC,
    };
  });

  const devicesJson = await devicesRes.json().catch(() => ({} as any));
  const devicesSource = Array.isArray(devicesJson?.devices) ? devicesJson.devices : [];
  const devices = devicesSource
    .map((device: any) => ({
      id: device.id ?? device.deviceId ?? '',
      slug: device.slug ?? device.deviceSlug ?? device.id ?? '',
      name: device.name ?? '',
    }))
    .filter((device) => device.id && device.slug && device.name);

  const duties = await fetchDuties(normalizedSlug, date);
  const groupForDuties = await prisma.group.findUnique({
    where: { slug: normalizedSlug },
    select: {
      dutyTypes: {
        select: {
          id: true,
          name: true,
          kind: true,
          rules: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              byWeekday: true,
              slotsPerDay: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      },
      members: {
        select: {
          userId: true,
          email: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  const memberOptions = (groupForDuties?.members ?? [])
    .map((member) => {
      const id = member.userId ?? member.user?.id ?? '';
      const email = member.user?.email ?? member.email ?? '';
      const name = member.user?.name || (email ? email.split('@')[0] : '');
      return { id, label: name || email, email };
    })
    .filter((member) => member.id);

  const dutyTypes = (groupForDuties?.dutyTypes ?? []).map((type) => ({
    ...type,
    rules: type.rules.map((rule) => ({
      ...rule,
      startDate:
        typeof rule.startDate === 'string'
          ? rule.startDate
          : rule.startDate?.toISOString() ?? '',
      endDate:
        typeof rule.endDate === 'string'
          ? rule.endDate
          : rule.endDate?.toISOString() ?? '',
    })),
  }));

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            href={`/groups/${encodeURIComponent(normalizedSlug)}`}
            className="text-indigo-600 hover:underline"
          >
            ← グループへ戻る
          </Link>
          <h1 className="text-xl font-bold">{date} の予約</h1>
        </div>
        <Link
          href={`/groups/${encodeURIComponent(normalizedSlug)}/reservations/new?date=${date}`}
          className="hidden sm:inline px-4 py-2 rounded bg-blue-600 text-white"
        >
          別ページで作成
        </Link>
      </div>

      <section className="rounded-2xl border p-4 bg-white">
        {list.length === 0 ? (
          <p className="text-gray-500">予約がありません。</p>
        ) : (
          <ul className="grid md:grid-cols-2 gap-3">
            {list.map((r) => {
              const isPast = r.endUtc.getTime() < Date.now();
              return (
                <li
                  key={r.id}
                  className={`rounded-xl border p-3 ${isPast ? 'text-gray-400 opacity-60' : ''}`}
                >
                  <div className="font-medium">{r.device.name}</div>
                  <div className="text-sm text-gray-600">
                    {formatTime(r.startLocal)} 〜 {formatTime(r.endLocal)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <InlineReservationForm slug={normalizedSlug} date={date} devices={devices} />

      <section className="rounded-2xl border p-4 space-y-3 bg-white">
        <h2 className="font-semibold">当日の当番</h2>
        {duties.length === 0 ? (
          <p className="text-gray-500">当番はありません。</p>
        ) : (
          <ul className="space-y-2">
            {duties.map((duty: any) => (
              <li key={duty.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span
                      className="font-medium"
                      style={{ color: duty.type?.color ?? '#7c3aed' }}
                    >
                      {duty.type?.name ?? '当番'}
                    </span>
                  </div>
                  <DutyInlineEditor
                    id={duty.id}
                    assigneeId={duty.assigneeId ?? duty.assignee?.id ?? null}
                    locked={Boolean(duty.locked)}
                    done={Boolean(duty.done)}
                    members={memberOptions}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <DutyInlineCreate date={date} members={memberOptions} types={dutyTypes} />
      </section>
    </div>
  );
}
