'use client';
import { useRouter } from 'next/navigation';
import CalendarWithBars, { Span } from '@/components/CalendarWithBars';
import ReservationList, { ReservationItem } from '@/components/ReservationList';

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
  listItems: ReservationItem[];
  groupSlug: string;
}) {
  const router = useRouter();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const handleSelect = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    router.push(`/groups/${encodeURIComponent(groupSlug.toLowerCase())}/day/${yyyy}-${mm}-${dd}`);
  };
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
        <ReservationList items={listItems} />
      </div>
    </>
  );
}
