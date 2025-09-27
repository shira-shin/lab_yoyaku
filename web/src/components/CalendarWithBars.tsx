'use client';
import { useMemo, useState } from 'react';
import clsx from 'clsx';

export type Span = {
  id: string;
  name: string;      // 機器名
  start: Date;
  end: Date;
  color: string;
  groupSlug: string;
  by: string;        // 予約者表示名
  participants?: string[];  // 任意
};

const pad = (n:number)=> n.toString().padStart(2,'0');
const short = (s:string,len=16)=> s.length<=len ? s : s.slice(0,len-1)+'…';

function strip(d:Date){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
function add(d:Date,n:number){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function overlaps(day:Date, s:Date, e:Date){ return day>=strip(s) && day<strip(add(e,1)); }

function labelForDay(cell: Date, s: Date, e: Date) {
  const cs = strip(cell), ce = add(cs, 1);
  const from = s < cs ? '00:00' : `${pad(s.getHours())}:${pad(s.getMinutes())}`;
  const to   = e > ce ? '24:00' : `${pad(e.getHours())}:${pad(e.getMinutes())}`;
  return `${from}–${to}`;
}

export default function CalendarWithBars({
  weeks,
  month,
  spans,
  onSelectDate,
  showModal = true,
}:{
  weeks: Date[][];
  month: number;
  spans: Span[];
  onSelectDate?: (d: Date) => void;
  showModal?: boolean;
}) {
  const [sel, setSel] = useState<Date | null>(null);

  const map = useMemo(()=>{
    const m = new Map<string, Span[]>();
    weeks.flat().forEach(d=>{
      const key=d.toDateString();
      m.set(key, spans.filter(s=>overlaps(d,s.start,s.end)));
    });
    return m;
  },[weeks,spans]);

  return (
    <>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((d,i)=>{
          const todays = map.get(d.toDateString()) ?? [];
          const isToday = d.toDateString() === new Date().toDateString();
          const isSun = d.getDay() === 0;
          const isSat = d.getDay() === 6;
          return (
            <button
              key={i}
              className={clsx(
                'h-16 rounded-lg border relative text-left px-1 transition-colors',
                isSun && 'bg-red-50',
                isSat && 'bg-blue-50',
                todays.length > 0 && 'bg-indigo-600/5',
                isToday && 'border-2 border-indigo-600'
              )}
              onClick={() => {
                if (showModal) {
                  setSel(d);
                }
                onSelectDate?.(d);
              }}
              aria-label={`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`}
            >
              <div className="absolute left-1 top-1 text-xs">{d.getDate()}</div>
              {todays.length > 0 && (
                <div className="absolute top-1 right-1 text-[10px] bg-indigo-600 text-white rounded-full h-4 w-4 flex items-center justify-center">
                  {todays.length}
                </div>
              )}
              <div className="absolute left-1 right-1 bottom-2 space-y-1">
                {todays.slice(0,2).map((s)=>(
                  <div
                    key={s.id}
                    className="h-4 rounded-sm flex items-center px-1 text-white print:text-black"
                    style={{backgroundColor:s.color}}
                  >
                    <span className="text-[10px] leading-none truncate print:hidden">
                      {short(`${s.name}（${labelForDay(d, s.start, s.end)}） / ${s.by}`, 28)}
                    </span>
                    <span className="hidden text-[10px] leading-none truncate print:inline">
                      {short(`${s.name} / ${s.by}`, 28)}
                    </span>
                  </div>
                ))}
                {todays.length>2 && <div className="text-[10px] text-muted">+{todays.length-2}</div>}
              </div>
            </button>
          );
        })}
      </div>

      {showModal && sel && (
        <DayModal
          date={sel}
          items={(map.get(sel.toDateString()) ?? []).sort((a,b)=>a.start.getTime()-b.start.getTime())}
          onClose={()=>setSel(null)}
        />
      )}
    </>
  );
}

function DayModal({ date, items, onClose }:{
  date:Date; items:Span[]; onClose:()=>void;
}){
  const pad=(n:number)=> n.toString().padStart(2,'0');
  const hhmm=(d:Date)=>`${pad(d.getHours())}:${pad(d.getMinutes())}`;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg w-full max-w-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">{date.getMonth()+1}月{date.getDate()}日の予約</div>
          <button onClick={onClose} className="text-sm text-muted hover:underline">閉じる</button>
        </div>
        {!items.length && <div className="text-sm text-muted">この日の予約はありません。</div>}
        <ul className="space-y-2">
          {items.map((s)=>(
            <li key={s.id} className="rounded-lg border p-3">
              <div className="font-medium">{s.name}</div>
              <div className="text-sm mt-1">
                {hhmm(s.start)} – {hhmm(s.end)}　/　予約者: <span className="font-medium">{s.by}</span>
              </div>
              {s.participants?.length ? (
                <div className="text-xs text-muted mt-1">参加者: {s.participants.join(', ')}</div>
              ) : null}
              <a href={`/groups/${s.groupSlug}`} className="text-sm text-indigo-600 hover:underline mt-2 inline-block">
                グループページへ
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

