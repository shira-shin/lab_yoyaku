import { readUserFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';

type Mine = {
  id: string; deviceId: string; deviceName?: string; user: string;
  start: string; end: string; purpose?: string; groupSlug: string; groupName: string;
};

// util
function pad(n:number){ return n.toString().padStart(2,'0'); }
function fmtRange(start:string,end:string) {
  const s=new Date(start), e=new Date(end);
  const sameDay = s.toDateString()===e.toDateString();
  const d = (d:Date)=>`${d.getMonth()+1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return sameDay ? `${d(s)}–${pad(e.getHours())}:${pad(e.getMinutes())}` : `${d(s)} → ${d(e)}`;
}

// 月カレンダー計算（月曜はじまり）
function buildMonth(base = new Date()){
  const y=base.getFullYear(), m=base.getMonth();
  const first = new Date(y,m,1);
  const start = new Date(first); start.setDate(first.getDate() - ((first.getDay()+6)%7));
  const weeks: Date[][] = [];
  for(let w=0; w<6; w++){
    const row: Date[] = [];
    for(let i=0;i<7;i++){ row.push(new Date(start)); start.setDate(start.getDate()+1); }
    weeks.push(row);
  }
  return { weeks, y, m };
}

export default async function Home() {
  const me = await readUserFromCookie();
  if (!me) redirect('/login?next=/');

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/me/reservations`, { cache:'no-store' });
  const json = await res.json();
  const all: Mine[] = (json?.data ?? []) as Mine[];
  all.sort((a,b)=> new Date(a.start).getTime() - new Date(b.start).getTime());

  const now = new Date();
  const upcoming = all.filter(r => new Date(r.end) >= now).slice(0, 10);

  // カレンダー用：当月に重なる自分の予約
  const { weeks, m } = buildMonth(now);
  type Span = { id:string; deviceName:string; start:Date; end:Date; color:string; groupSlug:string };
  const spans: Span[] = all.map(r => ({
    id:r.id, deviceName:r.deviceName ?? r.deviceId,
    start:new Date(r.start), end:new Date(r.end),
    color: colorFromString(r.deviceId),
    groupSlug: r.groupSlug,
  }));

  const card = "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <div className="flex gap-2">
          <a href="/groups/new" className="rounded-lg border px-3 py-2 hover:bg-gray-50">グループ作成</a>
          <a href="/groups/join" className="rounded-lg border px-3 py-2 hover:bg-gray-50">グループ参加</a>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 直近の予約（読みやすい行カード） */}
        <section className={`md:col-span-2 ${card}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="font-medium">直近の自分の予約</div>
            <a className="text-sm text-gray-500 hover:underline" href="/groups">すべてのグループへ</a>
          </div>

          {!upcoming.length && (
            <div className="text-gray-500 text-sm">直近の予約はありません。右上の「グループ参加」から始めましょう。</div>
          )}

          <ul className="space-y-2">
            {upcoming.map(r=>(
              <li key={r.id} className="rounded-lg border px-3 py-2">
                <div className="text-sm text-gray-600">{fmtRange(r.start,r.end)}（{r.groupName}）</div>
                <div className="font-medium mt-0.5">機器：{r.deviceName ?? r.deviceId}</div>
                {r.purpose && <div className="text-sm text-gray-500">用途：{r.purpose}</div>}
              </li>
            ))}
          </ul>
        </section>

        {/* 今月の予定：帯（バー）で表示 & クリックで詳細 */}
        <section className={card}>
          <CalendarWithBars weeks={weeks} month={m} spans={spans}/>
        </section>
      </div>
    </div>
  );
}

// ======= クライアント部（クリックでモーダル） =======
'use client';
import { useMemo, useState } from 'react';

function colorFromString(s:string){
  // 地味な8色から安定選択
  const palette = ['#0ea5e9','#22c55e','#f59e0b','#ef4444','#8b5cf6','#14b8a6','#f472b6','#64748b'];
  let h=0; for (let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i))>>>0;
  return palette[h % palette.length];
}

type Span = { id:string; deviceName:string; start:Date; end:Date; color:string; groupSlug:string };
function overlaps(d:Date, s:Date, e:Date){ // [s,e) と d の重なり
  return d >= stripTime(s) && d < stripTime(addDays(e,1));
}
function stripTime(d:Date){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(d:Date, n:number){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }

function CalendarWithBars({ weeks, month, spans }:{
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
              <a className="text-sm text-gray-500 hover:underline mt-1 inline-block"
                 href={`/groups/${s.groupSlug}`}>グループページへ</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
function timeStr(d:Date){ return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`; }

