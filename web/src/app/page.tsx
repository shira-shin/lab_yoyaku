import { readUserFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';

/* ---------- 型 & ユーティリティ ---------- */
type Mine = {
  id: string; deviceId: string; deviceName?: string; user: string;
  start: string; end: string; purpose?: string; groupSlug: string; groupName: string;
};
const pad = (n:number)=>n.toString().padStart(2,'0');
const fmtRange = (s:string,e:string)=>{
  const S=new Date(s), E=new Date(e);
  const same = S.toDateString()===E.toDateString();
  const d =(x:Date)=>`${x.getMonth()+1}/${x.getDate()} ${pad(x.getHours())}:${pad(x.getMinutes())}`;
  return same ? `${d(S)}–${pad(E.getHours())}:${pad(E.getMinutes())}` : `${d(S)} → ${d(E)}`;
};

function buildMonth(base=new Date()){
  const y=base.getFullYear(), m=base.getMonth();
  const first = new Date(y,m,1);
  const start = new Date(first); start.setDate(first.getDate()-((first.getDay()+6)%7)); // 月曜はじまり
  const weeks: Date[][]=[]; for(let w=0;w<6;w++){ const row:Date[]=[]; for(let i=0;i<7;i++){ row.push(new Date(start)); start.setDate(start.getDate()+1);} weeks.push(row);}
  return { weeks, month:m, year:y };
}
/* 機器ごとに安定カラー */
function colorFromString(s:string){
  const palette=['#2563eb','#16a34a','#f59e0b','#ef4444','#7c3aed','#0ea5e9','#f97316','#14b8a6'];
  let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0;
  return palette[h%palette.length];
}
const short = (s:string,len=8)=> s.length<=len ? s : s.slice(0,len-1)+'…';

/* ---------- サーバーコンポーネント ---------- */
export default async function Home() {
  const me = await readUserFromCookie();
  if (!me) redirect('/login?next=/');

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res  = await fetch(`${base}/api/me/reservations`, { cache:'no-store' });
  const mine: Mine[] = (await res.json()).data ?? [];
  mine.sort((a,b)=> new Date(a.start).getTime() - new Date(b.start).getTime());

  const now = new Date();
  const upcoming = mine.filter(r=> new Date(r.end)>=now).slice(0,10);
  const { weeks, month } = buildMonth(now);

  // カレンダー帯用（当月にかかる自分の予約）
  const spans = mine.map(r => ({
    id:r.id, name:r.deviceName ?? r.deviceId,
    start:new Date(r.start), end:new Date(r.end),
    color: colorFromString(r.deviceId), groupSlug:r.groupSlug
  }));

  // レジェンド（機器名→色）
  const legend = Array.from(new Map(spans.map(s=>[s.name, s.color])).entries());

  const card = "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <div className="flex gap-2">
          <a href="/groups/new"  className="rounded-lg border px-3 py-2 bg-indigo-600 text-white hover:bg-indigo-700">グループ作成</a>
          <a href="/groups/join" className="rounded-lg border px-3 py-2 hover:bg-gray-50">グループ参加</a>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 直近の自分の予約（機器名・時間・用途） */}
        <section className={`md:col-span-2 ${card}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium">直近の自分の予約</div>
            <a className="text-sm text-gray-500 hover:underline" href="/groups">すべてのグループへ</a>
          </div>
          {!upcoming.length && (
            <div className="text-gray-500 text-sm">直近の予約はありません。右上の「グループ参加」から始めましょう。</div>
          )}
          <ul className="space-y-2">
            {upcoming.map(r=>(
              <li key={r.id} className="rounded-lg border px-3 py-2 flex items-start gap-3">
                <span className="inline-block h-2.5 w-2.5 rounded-full mt-2" style={{backgroundColor:colorFromString(r.deviceId)}}/>
                <div className="flex-1">
                  <div className="text-sm text-gray-600">{fmtRange(r.start,r.end)}（{r.groupName}）</div>
                  <div className="font-medium mt-0.5">機器：{r.deviceName ?? r.deviceId}</div>
                  {r.purpose && <div className="text-sm text-gray-500">用途：{r.purpose}</div>}
                </div>
                <a className="text-sm text-gray-500 hover:underline" href={`/groups/${r.groupSlug}`}>詳細</a>
              </li>
            ))}
          </ul>
        </section>

        {/* 今月の予定（帯＋クリックで詳細） */}
        <section className={card}>
          <CalendarWithBars weeks={weeks} month={month} spans={spans} />
          {/* レジェンド */}
          {legend.length>0 && (
            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-1">色の対応</div>
              <div className="flex flex-wrap gap-3">
                {legend.map(([name,color])=>(
                  <span key={name} className="inline-flex items-center gap-1.5 text-sm">
                    <i className="inline-block h-2.5 w-2.5 rounded-full" style={{backgroundColor:color}}/> {short(name,10)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---------- クライアント部：帯＋モーダル ---------- */
'use client';
import { useMemo, useState } from 'react';
function strip(d:Date){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
function add(d:Date,n:number){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function overlaps(day:Date, s:Date, e:Date){ return day>=strip(s) && day<strip(add(e,1)); }

type Span = { id:string; name:string; start:Date; end:Date; color:string; groupSlug:string };

function CalendarWithBars({ weeks, month, spans }:{
  weeks: Date[][]; month:number; spans: Span[];
}){
  const [sel, setSel] = useState<Date|null>(null);

  // 各セルに、その日に関係する予約
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
              title={`${d.getMonth()+1}/${d.getDate()}`}
            >
              <div className="absolute right-1 top-1 text-xs">{d.getDate()}</div>

              {/* 帯（最大2本、テキスト付き） */}
              <div className="absolute left-1 right-1 bottom-2 space-y-1">
                {todays.slice(0,2).map((s)=>(
                  <div key={s.id} className="h-4 rounded-sm flex items-center px-1"
                       style={{backgroundColor:s.color, color:'#fff'}}>
                    <span className="text-[10px] leading-none truncate">{short(s.name,8)}</span>
                  </div>
                ))}
                {todays.length>2 && <div className="text-[10px] text-gray-500">+{todays.length-2}</div>}
              </div>
            </button>
          );
        })}
      </div>

      {/* モーダル：その日の一覧 */}
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
  const t = (d:Date)=>`${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{backgroundColor:s.color}}/>
                <div className="font-medium">{s.name}</div>
              </div>
              <div className="text-sm text-gray-600 mt-1">{t(s.start)} – {t(s.end)}</div>
              <a href={`/groups/${s.groupSlug}`} className="text-sm text-gray-500 hover:underline mt-1 inline-block">グループページへ</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

