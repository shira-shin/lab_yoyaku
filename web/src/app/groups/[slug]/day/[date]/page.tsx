export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { serverFetch } from '@/lib/http/serverFetch';

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

  const res = await serverFetch(`/api/reservations?${searchParams.toString()}`);
  if (res.status === 401) {
    redirect(`/login?next=/groups/${encodeURIComponent(normalizedSlug)}/day/${date}`);
  }
  if (res.status === 403 || res.status === 404) {
    redirect(`/groups/join?slug=${encodeURIComponent(normalizedSlug)}`);
  }
  if (!res.ok) {
    throw new Error('予約情報の取得に失敗しました');
  }

  const payload = await res.json();
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

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/groups/${encodeURIComponent(normalizedSlug)}`}
            className="text-sm text-indigo-600 hover:underline"
          >
            &larr; グループへ戻る
          </Link>
          <h1 className="text-xl font-bold mt-1">{date} の予約</h1>
        </div>
        <Link
          href={`/groups/${encodeURIComponent(normalizedSlug)}/reservations/new?date=${date}`}
          className="px-4 py-2 rounded bg-blue-600 text-white"
        >
          予約を追加
        </Link>
      </div>

      {list.length === 0 ? (
        <p className="text-gray-500">予約がありません。</p>
      ) : (
        <ul className="space-y-2">
          {list.map((r) => (
            <li key={r.id} className="rounded-lg border p-3">
              <div className="font-medium">{r.device.name}</div>
              <div className="text-sm text-gray-600">
                {formatTime(r.startsAt)} 〜 {formatTime(r.endsAt)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
