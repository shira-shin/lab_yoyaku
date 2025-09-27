export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { serverFetch } from '@/lib/http/serverFetch';
import InlineReservationForm from './InlineReservationForm';

type Reservation = {
  id: string;
  startsAt: string;
  endsAt: string;
  device: { name: string };
};

function isValidDateFormat(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toRange(date: string) {
  const from = new Date(`${date}T00:00:00Z`).toISOString();
  const to = new Date(`${date}T23:59:59Z`).toISOString();
  return { from, to };
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  const { from, to } = toRange(date);
  const searchParams = new URLSearchParams({
    groupSlug: normalizedSlug,
    from,
    to,
  });

  const [reservationsRes, devicesRes] = await Promise.all([
    serverFetch(`/api/reservations?${searchParams.toString()}`),
    serverFetch(`/api/devices?groupSlug=${encodeURIComponent(normalizedSlug)}`),
  ]);

  if (reservationsRes.status === 401 || devicesRes.status === 401) {
    redirect(`/login?next=/groups/${encodeURIComponent(normalizedSlug)}/day/${date}`);
  }
  if (
    reservationsRes.status === 403 ||
    reservationsRes.status === 404 ||
    devicesRes.status === 403 ||
    devicesRes.status === 404
  ) {
    redirect(`/groups/join?slug=${encodeURIComponent(normalizedSlug)}`);
  }
  if (!reservationsRes.ok) {
    throw new Error('予約情報の取得に失敗しました');
  }
  if (!devicesRes.ok) {
    throw new Error('機器情報の取得に失敗しました');
  }

  const payload = await reservationsRes.json();
  const source = payload?.data ?? payload?.reservations ?? [];
  const listRaw = Array.isArray(source) ? (source as Reservation[]) : [];
  const list = listRaw
    .map((item) => ({
      ...item,
      startsAt: item.startsAt ?? (item as any).start ?? '',
      endsAt: item.endsAt ?? (item as any).end ?? '',
    }))
    .filter((item) => item.startsAt && item.endsAt && item.device?.name)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const devicesJson = await devicesRes.json().catch(() => ({} as any));
  const devicesSource = Array.isArray(devicesJson?.devices) ? devicesJson.devices : [];
  const devices = devicesSource
    .map((device: any) => ({
      id: device.id ?? device.deviceId ?? '',
      name: device.name ?? '',
    }))
    .filter((device) => device.id && device.name);

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
            {list.map((r) => (
              <li key={r.id} className="rounded-xl border p-3">
                <div className="font-medium">{r.device.name}</div>
                <div className="text-sm text-gray-600">
                  {formatTime(r.startsAt)} 〜 {formatTime(r.endsAt)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <InlineReservationForm slug={normalizedSlug} date={date} devices={devices} />
    </div>
  );
}
