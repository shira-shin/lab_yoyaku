import { listDevices } from '@/lib/server-api';
import { notFound } from 'next/navigation';
import GroupScreenClient from './GroupScreenClient';
import { readUserFromCookie } from '@/lib/auth';
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
function colorFromString(s: string) {
  const palette = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#7c3aed', '#0ea5e9', '#f97316', '#14b8a6'];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export default async function GroupPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const base = getBaseUrl();

  const gRes = await fetch(`${base}/api/mock/groups/${slug}`, { cache: 'no-store' });
  if (gRes.status === 404) return notFound();
  if (!gRes.ok) throw new Error(`API ${gRes.status} /api/mock/groups/${slug}`);
  const group = (await gRes.json()).data;

  const [devicesRes, reservations, me] = await Promise.all([
    listDevices(group.slug),
    (async () => {
      const r = await fetch(`${base}/api/mock/reservations?slug=${slug}`, { cache: 'no-store' });
      if (r.ok) {
        const json = await r.json();
        return json.data ?? [];
      }
      if (r.status === 404) return [];
      throw new Error(`API ${r.status} /api/mock/reservations?slug=${slug}`);
    })(),
    readUserFromCookie(),
  ]);

  const { weeks, month, year } = buildMonth(new Date());
  const devices = devicesRes.data || [];
  const spans: Span[] = (reservations ?? []).map((r: any) => {
    const dev = group.devices.find((d: any)=> d.id === r.deviceId);
    return {
      id: r.id,
      name: dev?.name ?? r.deviceId,
      start: new Date(r.start),
      end: new Date(r.end),
      color: colorFromString(r.deviceId),
      groupSlug: group.slug,
      by: r.userName || r.user,
      participants: r.participants ?? [],
    };
  });

  const pad = (n: number) => n.toString().padStart(2, '0');
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const listItems: ReservationItem[] = reservations.map((r: any) => {
    const dev = group.devices.find((d: any) => d.id === r.deviceId);
    return {
      id: r.id,
      deviceName: dev?.name ?? r.deviceId,
      user: r.userName || r.user,
      start: new Date(r.start),
      end: new Date(r.end),
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="print:hidden space-y-4">
        <div className="flex gap-4">
          <BackButton className="text-blue-600 hover:underline" />
          <a href="/" className="text-blue-600 hover:underline">ホーム</a>
          <a href="/groups" className="text-blue-600 hover:underline">グループ一覧</a>
        </div>
        <GroupScreenClient
          initialGroup={group}
          initialDevices={devices}
          defaultReserver={me?.email}
        />
      </div>
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm relative">
        <div className="flex justify-between items-center mb-2">
          <div className="font-semibold">{group.name}　{year}年{month + 1}月</div>
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
          src={`/api/mock/groups/${group.slug}/qr`}
          alt="QRコード"
          width={128}
          height={128}
          className="mt-4 ml-auto print:fixed print:right-5 print:bottom-5"
        />
      </div>
    </div>
  );
}
