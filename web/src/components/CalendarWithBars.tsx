'use client';

import { useMemo, useState } from 'react';

export type Span = {
  id:string; deviceName:string; start:Date; end:Date; color:string; groupSlug:string;
};

function overlaps(d:Date, s:Date, e:Date){ // [s,e) と d の重なり
  return d >= stripTime(s) && d < stripTime(addDays(e,1));
}
function stripTime(d:Date){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(d:Date, n:number){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function timeStr(d:Date){ return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`; }

function DayModal({ date, items, onClose }:{
  date: Date; items: Span[]; onClose: ()=>void;
}){
  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg w-full max-w-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">{date.getMonth()+1}月{date.getDate()}日の予約</div>
          <button className="text-sm text-gray-500 hover:underline" onClick={onClose}>閉じる</button>
        </div>
        {!items.length && <div className="text-sm text-gray-500">この日の予約はありません。</div>}
        <ul className="space-y-2">
          {items.map((s)=>(
            <li key={s.id} className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{backgroundColor:s.color}} />
                <div className="font-medium">{s.deviceName}</div>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {timeStr(s.start)} – {timeStr(s.end)}
              </div>
              <a className="text-sm text-gray-500 hover:underline mt-1 inline-block" href={`/groups/${s.groupSlug}`}>グループページへ</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function CalendarWithBars({ weeks, month, spans }:{
  weeks: Date[][]; month: number; spans: Span[];
}){
  const [selected, setSelected] = useState<Date|null>(null);

  // 日付 → その日に関係する予約
  const map = useMemo(()=> {
    const m = new Map<string, Span[]>();
    weeks.flat().forEach(d=>{
      const key = d.toDateString();
      const arr = spans.filter(s => overlaps(d, s.start, s.end));
      m.set(key, arr);
    });
    return m;
  }, [weeks, spans]);

  return (
    <>
      <div className="font-medium mb-3">今月の予定 <span className="text-gray-400 text-sm">({month+1}月)</span></div>
      <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-2">
        {['月','火','水','木','金','土','日'].map(d => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((d,i)=>{
          const inMonth = d.getMonth()===month;
          const todays = map.get(d.toDateString()) ?? [];
          return (
            <button
              key={i}
              className={`h-16 rounded-lg border text-sm relative text-left px-1 ${inMonth? 'bg-white': 'bg-gray-50 text-gray-400'}`}
              onClick={()=> setSelected(d)}
            >
              <div className="absolute right-1 top-1 text-xs">{d.getDate()}</div>
              {/* 帯（最大3本表示、超過は…） */}
              <div className="absolute left-1 right-1 bottom-1 space-y-1">
                {todays.slice(0,3).map((s,idx)=>(
                  <div
                    key={s.id+idx}
                    className="h-1.5 rounded-sm"
                    style={{ backgroundColor: s.color }}
                    title={s.deviceName}
                  />
                ))}
                {todays.length>3 && <div className="text-[10px] text-gray-400">+{todays.length-3}</div>}
              </div>
            </button>
          );
        })}
      </div>

      {/* モーダル：その日の予約詳細 */}
      {selected && (
        <DayModal
          date={selected}
          items={(map.get(selected.toDateString()) ?? []).sort((a,b)=>a.start.getTime()-b.start.getTime())}
          onClose={()=>setSelected(null)}
        />
      )}
    </>
  );
}

