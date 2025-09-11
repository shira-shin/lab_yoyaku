import { loadDB } from '@/lib/mockdb';
import { notFound } from 'next/navigation';
import CalendarWithBars, { Span } from '@/components/CalendarWithBars';
import { getBaseUrl } from '@/lib/base-url';
import PrintButton from '@/components/PrintButton';
import Image from 'next/image';
import BackButton from '@/components/BackButton';
import ReservationList, { ReservationItem } from '@/components/ReservationList';
import { headers } from 'next/headers';

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

export default async function DevicePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { month?: string };
}) {
  const { slug } = params;
  const db = loadDB();
  const group = db.groups.find((g: any) => (g.devices ?? []).some((d: any) => d.slug === slug));
  const device = group?.devices.find((d: any) => d.slug === slug);
  if (!group || !device) return notFound();

  const base = getBaseUrl();
  const cookie = headers().get('cookie') ?? '';
  const r = await fetch(
    `${base}/api/mock/reservations?slug=${group.slug}&deviceId=${device.id}`,
    { cache: 'no-store', headers: { cookie } }
  );
  const json = r.ok ? await r.json() : { data: [] };
  const reservations = json.data || [];

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
  const spans: Span[] = reservations.map((res: any) => ({
    id: res.id,
    name: device.name,
    start: new Date(res.start),
    end: new Date(res.end),
    color: '#2563eb',
    groupSlug: group.slug,
    by: res.userName || res.user,
    participants: res.participants ?? [],
  }));

  const listItems: ReservationItem[] = reservations.map((r: any) => ({
    id: r.id,
    deviceName: device.name,
    user: r.userName || r.user,
    start: new Date(r.start),
    end: new Date(r.end),
  }));

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="print:hidden flex gap-4 mb-4">
        <BackButton className="text-blue-600 hover:underline" />
        <a href="/" className="text-blue-600 hover:underline">ホーム</a>
        <a href={`/groups/${group.slug}`} className="text-blue-600 hover:underline">グループページ</a>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm relative">
        <div className="flex justify-between items-center mb-2">
          <a
            href={`?month=${toParam(prev)}`}
            className="px-2 py-1 rounded border print:hidden"
          >
            ‹
          </a>
          <div className="font-semibold">{device.name}　{year}年{month + 1}月</div>
          <div className="flex items-center gap-2">
            <a
              href={`?month=${toParam(next)}`}
              className="px-2 py-1 rounded border print:hidden"
            >
              ›
            </a>
            <div className="print:hidden">
              <PrintButton className="btn-primary" />
            </div>
          </div>
        </div>
        <CalendarWithBars weeks={weeks} month={month} spans={spans} />
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">予約一覧</h2>
          <ReservationList items={listItems} />
        </div>
        <Image
          src={`/api/mock/devices/${slug}/qr`}
          alt="QRコード"
          width={128}
          height={128}
          className="w-0 h-0 opacity-0 mt-4 ml-auto print:w-32 print:h-32 print:opacity-100 print:block print:fixed print:right-5 print:bottom-5"
        />
      </div>
    </div>
  );
}
