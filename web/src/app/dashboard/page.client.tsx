'use client';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import UpcomingReservations, { Item } from '../_parts/UpcomingReservations';
import type CalendarWithBarsBase, { Span } from '@/components/CalendarWithBars';
import { addMonths, buildWeeks, firstOfMonth } from '@/lib/date-cal';
import { utcIsoToLocalDate } from '@/lib/time';

type CalendarProps = ComponentProps<typeof CalendarWithBarsBase>;

const CalendarWithBars = dynamic<CalendarProps>(
  () => import('@/components/CalendarWithBars'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] w-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-sm text-gray-500">
        カレンダーを読み込み中…
      </div>
    ),
  },
);

export default function DashboardClient({
  initialItems,
  initialSpans,
  isLoggedIn,
  initialError,
}: {
  initialItems: Item[];
  initialSpans: Span[];
  isLoggedIn: boolean;
  initialError?: 'unauth' | 'load' | null;
}) {
  const [spans, setSpans] = useState<Span[]>(initialSpans);
  const today = new Date();
  const [anchor, setAnchor] = useState(firstOfMonth(today.getFullYear(), today.getMonth()));
  const [calendarVisible, setCalendarVisible] = useState(false);
  const calendarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (calendarVisible) return;
    const element = calendarRef.current;
    if (!element) return;

    const media = window.matchMedia('(min-width: 768px)');
    if (media.matches) {
      setCalendarVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setCalendarVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [calendarVisible]);

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
    <div className="grid gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-[2fr,1fr]">
      <section className={`md:col-span-2 ${card}`}>
        <UpcomingReservations
          initialItems={initialItems}
          onLoaded={handleLoaded}
          isLoggedIn={isLoggedIn}
          initialError={initialError}
        />
      </section>

      <section ref={calendarRef} className={`${card} space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium text-lg sm:text-xl">予約カレンダー</h2>
          <div className="flex w-full justify-end gap-2 sm:w-auto">
            <button
              className="flex-1 rounded border px-2 py-1 text-sm sm:flex-none"
              onClick={() => setAnchor((a) => addMonths(a, -1))}
            >
              ‹
            </button>
            <div className="flex flex-1 items-center justify-center rounded border px-3 py-1 text-sm font-medium sm:flex-none sm:min-w-[180px]">
              {anchor.getFullYear()}年 {anchor.getMonth() + 1}月
            </div>
            <button
              className="flex-1 rounded border px-2 py-1 text-sm sm:flex-none"
              onClick={() => setAnchor((a) => addMonths(a, 1))}
            >
              ›
            </button>
          </div>
        </div>
        {calendarVisible ? (
          <CalendarWithBars weeks={weeks} month={month} spans={monthSpans} />
        ) : (
          <div className="flex h-[320px] items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">
            カレンダーを表示する準備中です…
          </div>
        )}
      </section>
    </div>
  );
}

