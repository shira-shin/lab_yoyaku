import { readUserFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CalendarWithBars, { Span } from '@/components/CalendarWithBars';

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

// 地味な8色から安定選択
function colorFromString(s:string){
  const palette = ['#0ea5e9','#22c55e','#f59e0b','#ef4444','#8b5cf6','#14b8a6','#f472b6','#64748b'];
  let h=0; for (let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i))>>>0;
  return palette[h % palette.length];
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

