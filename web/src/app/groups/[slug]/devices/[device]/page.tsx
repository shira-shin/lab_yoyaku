import { serverFetch } from '@/lib/server-fetch';
import { notFound, redirect } from 'next/navigation';
import CalendarWithBars, { Span } from '@/components/CalendarWithBars';
import PrintButton from '@/components/PrintButton';
import Image from 'next/image';
import BackButton from '@/components/BackButton';
import ReservationList, { ReservationItem } from '@/components/ReservationList';

export const dynamic = 'force-dynamic';

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
  params: { slug: string; device: string };
  searchParams: { month?: string };
}) {
  const { slug, device } = params;
  const group = slug;
  const res = await serverFetch(
    `/api/mock/groups/${encodeURIComponent(group)}/devices/${encodeURIComponent(device)}`
  );
  if (res.status === 401) redirect(`/login?next=/groups/${group}/devices/${device}`);
  if (res.status === 404) return notFound();
  if (!res.ok) throw new Error(`failed: ${res.status}`);
  const json = await res.json();
  const dev = json?.device;
  const reservations: any[] = Array.isArray(json?.reservations)
    ? json.reservations
    : [];

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
  const spans: Span[] = reservations.map((r: any) => ({
    id: r.id,
    name: dev?.name ?? r.deviceId,
    start: new Date(r.start),
    end: new Date(r.end),
    color: '#2563eb',
    groupSlug: group,
    by: r.userName || r.user,
    participants: r.participants ?? [],
  }));

  const listItems: ReservationItem[] = reservations.map((r: any) => ({
    id: r.id,
    deviceName: dev?.name ?? r.deviceId,
    user: r.userName || r.user,
    start: new Date(r.start),
    end: new Date(r.end),
  }));

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
        <CalendarWithBars weeks={weeks} month={month} spans={spans} />
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">予約一覧</h2>
          <ReservationList items={listItems} />
        </div>
        <Image
          src={`/api/mock/devices/${encodeURIComponent(device)}/qr`}
          alt="QRコード"
          width={128}
          height={128}
          className="w-0 h-0 opacity-0 mt-4 ml-auto print:w-32 print:h-32 print:opacity-100 print:block print:fixed print:right-5 print:bottom-5"
        />
      </div>
    </div>
  );
}
