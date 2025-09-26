'use client';
import { useMemo } from 'react';
import CalendarWithBars, { Span } from '@/components/CalendarWithBars';
import ReservationList, { ReservationItem } from '@/components/ReservationList';
import { useRouter } from 'next/navigation';

export default function CalendarReservationSection({
  weeks,
  month,
  spans,
  listItems,
  groupSlug,
  devices,
}: {
  weeks: Date[][];
  month: number;
  spans: Span[];
  listItems: ReservationItem[];
  groupSlug: string;
  devices: any[];
}) {
  const router = useRouter();
  const handleSelect = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    router.push(`/groups/${encodeURIComponent(groupSlug)}/calendar?date=${year}-${month}-${day}`);
  };
  const items = useMemo(() => listItems, [listItems]);
  return (
    <>
      <CalendarWithBars
        weeks={weeks}
        month={month}
        spans={spans}
        onSelectDate={handleSelect}
        showModal={false}
      />
      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-2">予約一覧</h2>
        <ReservationList items={items} />
      </div>
      </>
    );
  }
