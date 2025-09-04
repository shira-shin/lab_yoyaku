'use client';
import { useMemo, useState } from 'react';
import CalendarWithBars, { Span } from '@/components/CalendarWithBars';
import ReservationList, { ReservationItem } from '@/components/ReservationList';
import ReservationForm from './ReservationForm';

export default function CalendarReservationSection({
  weeks,
  month,
  spans,
  listItems,
  groupSlug,
  devices,
  defaultReserver,
}: {
  weeks: Date[][];
  month: number;
  spans: Span[];
  listItems: ReservationItem[];
  groupSlug: string;
  devices: any[];
  defaultReserver?: string;
}) {
  const [selected, setSelected] = useState<Date | null>(null);
  const [formDate, setFormDate] = useState<Date | null>(null);
  const handleSelect = (d: Date) => {
    setSelected(d);
    setFormDate(d);
  };
  const pad = (n: number) => n.toString().padStart(2, '0');
  const buildDateTime = (d: Date, h: number) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(h)}:00`;
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
        onSelectDate={handleSelect}
        showModal={false}
      />
      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-2">
          予約一覧{selected && ` (${selected.getMonth() + 1}/${selected.getDate()})`}
        </h2>
        <ReservationList items={items} />
      </div>
      {formDate && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-5 shadow-lg space-y-4 w-full max-w-3xl">
            <ReservationForm
              groupSlug={groupSlug}
              devices={devices}
              defaultReserver={defaultReserver}
              defaultStart={buildDateTime(formDate, 9)}
              defaultEnd={buildDateTime(formDate, 10)}
            />
            <div className="text-right">
              <button
                onClick={() => setFormDate(null)}
                className="px-3 py-1 rounded border"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
