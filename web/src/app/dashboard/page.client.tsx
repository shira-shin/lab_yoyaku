'use client';
import { useMemo, useState } from 'react';
import UpcomingReservations, { Item } from '../_parts/UpcomingReservations';
import CalendarWithBars, { Span } from '@/components/CalendarWithBars';
import { addMonths, buildWeeks, firstOfMonth } from '@/lib/date-cal';
import { utcIsoToLocalDate } from '@/lib/time';

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

  const handleLoaded = (j: any) => {
    const all = (j.all ?? []) as any[];
    const updated: Span[] = all.map((r: any) => {
        const userObj = typeof r.user === 'object' && r.user !== null ? r.user : null;
        const userEmail: string | undefined = userObj?.email ?? (typeof r.user === 'string' ? r.user : undefined) ?? r.userEmail;
        const displayName =
          userObj?.name ||
          r.userName ||
          (typeof r.user === 'string' ? r.user.split('@')[0] : undefined) ||
          (userEmail ? userEmail.split('@')[0] : '');

        const startIso = new Date(r.startsAtUTC ?? r.start).toISOString();
        const endIso = new Date(r.endsAtUTC ?? r.end).toISOString();

        return {
          id: r.id,
          name: r.deviceName ?? r.deviceId,
          startsAtUTC: startIso,
          endsAtUTC: endIso,
          start: utcIsoToLocalDate(startIso),
          end: utcIsoToLocalDate(endIso),
          groupSlug: r.groupSlug,
          by: displayName,
          participants: r.participants ?? [],
          device: r.deviceId ? { id: r.deviceId, name: r.deviceName ?? r.deviceId } : null,
        };
      });
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
      </section>
    </div>
  );
}

