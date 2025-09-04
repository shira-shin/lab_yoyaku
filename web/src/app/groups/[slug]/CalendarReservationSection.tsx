'use client';
import { useMemo, useState } from 'react';
import CalendarWithBars, { Span } from '@/components/CalendarWithBars';
import ReservationList, { ReservationItem } from '@/components/ReservationList';

export default function CalendarReservationSection({
  weeks,
  month,
  spans,
  listItems,
}: {
  weeks: Date[][];
  month: number;
  spans: Span[];
  listItems: ReservationItem[];
}) {
  const [selected, setSelected] = useState<Date | null>(null);
  const items = useMemo(() => {
    if (!selected) return listItems;
    return listItems.filter(
      (i) => i.start.toDateString() === selected.toDateString()
    );
  }, [selected, listItems]);
  return (
    <>
      <CalendarWithBars
        weeks={weeks}
        month={month}
        spans={spans}
        onSelectDate={setSelected}
        showModal={false}
      />
      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-2">
          予約一覧{selected && ` (${selected.getMonth() + 1}/${selected.getDate()})`}
        </h2>
        <ReservationList items={items} />
      </div>
    </>
  );
}
