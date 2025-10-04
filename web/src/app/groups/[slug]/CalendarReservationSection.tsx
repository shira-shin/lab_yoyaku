'use client';
import { useMemo, useState } from 'react';
import CalendarWithBars, { Span } from '@/components/CalendarWithBars';
import ReservationPanel from '@/components/reservations/ReservationPanel';
import type { ReservationListItem } from '@/components/reservations/ReservationList';
import { APP_TZ } from '@/lib/time';

export default function CalendarReservationSection({
  weeks,
  month,
  spans,
  listItems,
  groupSlug,
}: {
  weeks: Date[][];
  month: number;
  spans: Span[];
  listItems: ReservationListItem[];
  groupSlug: string;
}) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const displayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('ja-JP', {
        timeZone: APP_TZ,
        month: 'numeric',
        day: 'numeric',
        weekday: 'short',
      }),
    []
  );

  const handleSelect = (date: Date) => {
    setSelectedDate((prev) => {
      if (prev) {
        const prevKey = `${prev.getFullYear()}-${prev.getMonth()}-${prev.getDate()}`;
        const nextKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        if (prevKey === nextKey) {
          return null;
        }
      }
      return new Date(date);
    });
  };

  const selectedLabel = selectedDate ? displayFormatter.format(selectedDate) : null;

  return (
    <>
      <CalendarWithBars
        weeks={weeks}
        month={month}
        spans={spans}
        onSelectDate={handleSelect}
        showModal
        selectedDate={selectedDate}
      />
      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-2">予約一覧</h2>
        {selectedLabel && (
          <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
            <div>
              <span className="font-medium text-gray-800">{selectedLabel}</span> の予約
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="text-xs text-blue-600 hover:underline"
            >
              すべて表示
            </button>
          </div>
        )}
        <ReservationPanel items={listItems} selectedDate={selectedDate} />
      </div>
    </>
  );
}
