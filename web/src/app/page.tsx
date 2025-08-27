import { readUserFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CalendarWithBars, { Span } from '@/components/CalendarWithBars';

type Mine = {
  id:string; deviceId:string; deviceName?:string; user:string; userName?:string;
  participants?: string[];
  start:string; end:string; purpose?:string; groupSlug:string; groupName:string;
};

const pad = (n:number)=> n.toString().padStart(2,'0');
const fmtRange = (s:string,e:string)=>{
  const S=new Date(s), E=new Date(e);
  const same = S.toDateString()===E.toDateString();
  const d =(x:Date)=>`${x.getMonth()+1}/${x.getDate()} ${pad(x.getHours())}:${pad(x.getMinutes())}`;
  return same ? `${d(S)}–${pad(E.getHours())}:${pad(E.getMinutes())}` : `${d(S)} → ${d(E)}`;
};

function buildMonth(base=new Date()){
  const y=base.getFullYear(), m=base.getMonth();
  const first = new Date(y,m,1);
  const start = new Date(first); start.setDate(first.getDate()-((first.getDay()+6)%7));
  const weeks: Date[][]=[]; for(let w=0;w<6;w++){ const row:Date[]=[]; for(let i=0;i<7;i++){ row.push(new Date(start)); start.setDate(start.getDate()+1);} weeks.push(row); }
  return { weeks, month:m };
}
function colorFromString(s:string){
  const palette=['#2563eb','#16a34a','#f59e0b','#ef4444','#7c3aed','#0ea5e9','#f97316','#14b8a6'];
  let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0;
  return palette[h%palette.length];
}
const short = (s:string,len=10)=> s.length<=len ? s : s.slice(0,len-1)+'…';

export default async function Home() {
  const me = await readUserFromCookie();
  if (!me) redirect('/login?next=/');

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/me/reservations`, { cache:'no-store' });
  const mine: Mine[] = (await res.json()).data ?? [];
  mine.sort((a,b)=> new Date(a.start).getTime() - new Date(b.start).getTime());

  const now = new Date();
  const upcoming = mine.filter(r=> new Date(r.end)>=now).slice(0,10);
  const { weeks, month } = buildMonth(now);

  const spans: Span[] = mine.map((r:any)=>({
    id: r.id,
    name: r.deviceName ?? r.deviceId,
    start: new Date(r.start),
    end: new Date(r.end),
    color: colorFromString(r.deviceId),
    groupSlug: r.groupSlug,
    by: r.userName || r.user,
    participants: r.participants ?? [],
  }));

  const legend = Array.from(new Map(spans.map(s=>[s.name, s.color])).entries());
  const card = "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <div className="flex gap-2">
          <a href="/groups/new"  className="rounded-lg border px-3 py-2 bg-indigo-600 text-white hover:bg-indigo-700">グループ作成</a>
          <a href="/groups/join" className="rounded-lg border px-3 py-2 hover:bg-gray-50">グループ参加</a>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
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

        <section className={card}>
          <CalendarWithBars weeks={weeks} month={month} spans={spans}/>
          {legend.length>0 && (
            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-1">色の対応</div>
              <div className="flex flex-wrap gap-3">
                {legend.map(([name,color])=>(
                  <span key={name} className="inline-flex items-center gap-1.5 text-sm">
                    <i className="inline-block h-2.5 w-2.5 rounded-full" style={{backgroundColor:color}}/> {short(name)}
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

