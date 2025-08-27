'use client';
import { useMemo, useState } from 'react';
import CalendarWithBars, { Span } from '@/components/CalendarWithBars';
import { addMonths, buildWeeks, firstOfMonth } from '@/lib/date-cal';

export default function RightCalendarClient({ spans }: { spans: Span[] }) {
  const today = new Date();
  const [anchor, setAnchor] = useState(firstOfMonth(today.getFullYear(), today.getMonth()));

  const { month, weeks, monthSpans } = useMemo(()=>{
    const m = anchor.getMonth();
    const w = buildWeeks(anchor);
    // 選択中の月にかかる予約だけ抽出（端はOK）
    const ms = spans.filter(s =>
      s.start <= new Date(anchor.getFullYear(), anchor.getMonth()+1, 1) &&
      s.end   >= new Date(anchor.getFullYear(), anchor.getMonth(),   1)
    );
    return { month: m, weeks: w, monthSpans: ms };
  },[anchor, spans]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button className="px-2 py-1 rounded border" onClick={()=>setAnchor(a=>addMonths(a,-1))}>‹</button>
        <div className="font-medium">{anchor.getFullYear()}年 {anchor.getMonth()+1}月</div>
        <button className="px-2 py-1 rounded border" onClick={()=>setAnchor(a=>addMonths(a, 1))}>›</button>
      </div>
      <CalendarWithBars weeks={weeks} month={month} spans={monthSpans}/>
    </div>
  );
}

