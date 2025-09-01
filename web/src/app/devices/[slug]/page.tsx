import { loadDB } from '@/lib/mockdb';
import { notFound } from 'next/navigation';
import CalendarWithBars, { Span } from '@/components/CalendarWithBars';
import { getBaseUrl } from '@/lib/config';
import PrintButton from '@/components/PrintButton';

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
  return { weeks, month: m };
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

  const { weeks, month } = buildMonth(new Date());
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

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">{device.name}</h1>
          {device.note && <p className="text-sm text-neutral-500">{device.note}</p>}
          <p className="text-sm text-neutral-500">グループ: {group.name}</p>
        </div>
        <div className="print:hidden">
          <PrintButton className="btn-primary" />
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <CalendarWithBars weeks={weeks} month={month} spans={spans} />
      </div>
    </div>
  );
}
