'use client';
import { useMemo, useState } from 'react';
import UpcomingReservations, { Item } from '../_parts/UpcomingReservations';
import CalendarWithBars, { Span } from '@/components/CalendarWithBars';
import { addMonths, buildWeeks, firstOfMonth } from '@/lib/date-cal';

const short = (s: string, len = 10) => (s.length <= len ? s : s.slice(0, len - 1) + '…');
function colorFromString(s: string) {
  const palette = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#7c3aed', '#0ea5e9', '#f97316', '#14b8a6'];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export default function DashboardClient({ initialItems, initialSpans, isLoggedIn }: { initialItems: Item[]; initialSpans: Span[]; isLoggedIn: boolean }) {
  const [spans, setSpans] = useState<Span[]>(initialSpans);
  const today = new Date();
  const [anchor, setAnchor] = useState(firstOfMonth(today.getFullYear(), today.getMonth()));

  const { month, weeks, monthSpans } = useMemo(() => {
    const m = anchor.getMonth();
    const w = buildWeeks(anchor);
    const ms = spans.filter(
      (s) =>
        s.start <= new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1) &&
        s.end >= new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    );
    return { month: m, weeks: w, monthSpans: ms };
  }, [anchor, spans]);

  const legend = useMemo(
    () => Array.from(new Map(spans.map((s) => [s.name, s.color])).entries()),
    [spans]
  );

  const handleLoaded = (j: any) => {
    const all = (j.all ?? []) as any[];
    const updated: Span[] = all.map((r: any) => ({
      id: r.id,
      name: r.deviceName ?? r.deviceId,
      start: new Date(r.start),
      end: new Date(r.end),
      color: colorFromString(r.deviceId),
      groupSlug: r.groupSlug,
      by: r.userName || r.user,
      participants: r.participants ?? [],
    }));
    setSpans(updated);
  };

  const card = 'rounded-xl border border-gray-200 bg-white p-5 shadow-sm';

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <section className={`md:col-span-2 ${card}`}>
        <UpcomingReservations
          initialItems={initialItems}
          onLoaded={handleLoaded}
          isLoggedIn={isLoggedIn}
        />
      </section>

      <section className={card}>
        <h2 className="font-medium mb-2">予約カレンダー</h2>
        <div className="flex items-center justify-between mb-2">
          <button className="px-2 py-1 rounded border" onClick={() => setAnchor((a) => addMonths(a, -1))}>
            ‹
          </button>
          <div className="font-medium">
            {anchor.getFullYear()}年 {anchor.getMonth() + 1}月
          </div>
          <button className="px-2 py-1 rounded border" onClick={() => setAnchor((a) => addMonths(a, 1))}>
            ›
          </button>
        </div>
        <CalendarWithBars weeks={weeks} month={month} spans={monthSpans} />
        {legend.length > 0 && (
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-1">色の対応</div>
            <div className="flex flex-wrap gap-3">
              {legend.map(([name, color]) => (
                <span key={name} className="inline-flex items-center gap-1.5 text-sm">
                  <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /> {short(name)}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

