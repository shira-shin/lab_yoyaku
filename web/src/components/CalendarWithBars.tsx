'use client';
import { useMemo, useState } from 'react';

export type Span = { id:string; name:string; start:Date; end:Date; color:string; groupSlug:string };

const pad = (n:number)=> n.toString().padStart(2,'0');
const short = (s:string,len=14)=> s.length<=len ? s : s.slice(0,len-1)+'…';

function strip(d:Date){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
function add(d:Date,n:number){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function overlaps(day:Date, s:Date, e:Date){ return day>=strip(s) && day<strip(add(e,1)); }

// そのセルの日付に対する「開始–終了」ラベル（日またぎ対応）
function labelForDay(cell: Date, s: Date, e: Date) {
  const cs = strip(cell);
  const ce = add(cs, 1);
  const from = s < cs ? '00:00' : `${pad(s.getHours())}:${pad(s.getMinutes())}`;
  const to   = e > ce ? '24:00' : `${pad(e.getHours())}:${pad(e.getMinutes())}`;
  return `${from}–${to}`;
}

export default function CalendarWithBars({
  weeks, month, spans,
}:{
  weeks: Date[][];
  month: number;
  spans: Span[];
}) {
  const [sel, setSel] = useState<Date|null>(null);

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
      <div className="font-medium mb-3">今月の予定 <span className="text-gray-400 text-sm">({month+1}月)</span></div>
      <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-2">
        {['月','火','水','木','金','土','日'].map(d=><div key={d} className="py-1">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((d,i)=>{
          const inMonth = d.getMonth()===month;
          const todays = map.get(d.toDateString()) ?? [];
          return (
            <button
              key={i}
              className={`h-16 rounded-lg border relative text-left px-1 ${inMonth?'bg-white':'bg-gray-50 text-gray-400'}`}
              onClick={()=>setSel(d)}
            >
              <div className="absolute right-1 top-1 text-xs">{d.getDate()}</div>
              <div className="absolute left-1 right-1 bottom-2 space-y-1">
                {todays.slice(0,2).map((s)=>(
                  <div key={s.id} className="h-4 rounded-sm flex items-center px-1"
                       style={{backgroundColor:s.color, color:'#fff'}}>
                    <span className="text-[10px] leading-none truncate">
                      {short(`${s.name}（${labelForDay(d, s.start, s.end)}）`, 16)}
                    </span>
                  </div>
                ))}
                {todays.length>2 && <div className="text-[10px] text-gray-500">+{todays.length-2}</div>}
              </div>
            </button>
          );
        })}
      </div>

      {sel && (
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
  const row = (s:Span)=> `${s.name}（${labelForDay(date, s.start, s.end)}）`;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg w-full max-w-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">{date.getMonth()+1}月{date.getDate()}日の予約</div>
          <button onClick={onClose} className="text-sm text-gray-500 hover:underline">閉じる</button>
        </div>
        {!items.length && <div className="text-sm text-gray-500">この日の予約はありません。</div>}
        <ul className="space-y-2">
          {items.map((s)=>(
            <li key={s.id} className="rounded-lg border p-3">
              <div className="font-medium">{row(s)}</div>
              <a href={`/groups/${s.groupSlug}`} className="text-sm text-gray-500 hover:underline mt-1 inline-block">グループページへ</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
