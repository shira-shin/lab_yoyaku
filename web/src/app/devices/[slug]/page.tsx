import { loadDB } from '@/lib/mockdb';
import { notFound } from 'next/navigation';
import CalendarWithBars, { Span } from '@/components/CalendarWithBars';
import { getBaseUrl } from '@/lib/config';
import PrintButton from '@/components/PrintButton';
import BackButton from '@/components/BackButton';
import ReservationList, { ReservationItem } from '@/components/ReservationList';
import Image from 'next/image';

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

export default async function DevicePage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const db = loadDB();
  const group = db.groups.find((g: any) => (g.devices ?? []).some((d: any) => d.slug === slug));
  const device = group?.devices.find((d: any) => d.slug === slug);
  if (!group || !device) return notFound();

  const base = getBaseUrl();
  const r = await fetch(
    `${base}/api/mock/reservations?slug=${group.slug}&deviceId=${device.id}`,
    { cache: 'no-store' }
  );
  const json = r.ok ? await r.json() : { data: [] };
  const reservations = json.data || [];

  const { weeks, month, year } = buildMonth(new Date());
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
          <div className="font-semibold">{device.name}　{year}年{month + 1}月</div>
          <div className="print:hidden">
            <PrintButton className="btn-primary" />
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
          className="mt-4 ml-auto print:fixed print:right-5 print:bottom-5"
        />
      </div>
    </div>
  );
}
