import { getGroup, listDevices, listReservations } from '@/lib/server-api';
import { notFound } from 'next/navigation';
import GroupScreenClient from './GroupScreenClient';
import { readUserFromCookie } from '@/lib/auth';
import CalendarWithBars, { Span } from '@/components/CalendarWithBars';
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
function colorFromString(s: string) {
  const palette = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#7c3aed', '#0ea5e9', '#f97316', '#14b8a6'];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export default async function GroupPage({ params }: { params: { slug: string } }) {
  const groupRes = await getGroup(params.slug);
  const group = groupRes.data;
  if (!groupRes.ok || !group) return notFound();

  const [devicesRes, reservationsRes, me] = await Promise.all([
    listDevices(group.slug),
    listReservations(group.slug),
    readUserFromCookie(),
  ]);

  const { weeks, month } = buildMonth(new Date());
  const devices = devicesRes.data || [];
  const reservations = reservationsRes.data || [];
  const spans: Span[] = reservations.map(r => {
    const dev = devices.find(d => d.id === r.deviceId);
    return {
      id: r.id,
      name: dev?.name ?? r.deviceId,
      start: new Date(r.start),
      end: new Date(r.end),
      color: colorFromString(r.deviceId),
      groupSlug: group.slug,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <GroupScreenClient
        initialGroup={group}
        initialDevices={devices}
        defaultReserver={me?.email}
      />
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <CalendarWithBars weeks={weeks} month={month} spans={spans} />
      </div>
    </div>
  );
}
