import { readUserFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';

type Mine = {
  id: string; deviceId: string; user: string; start: string; end: string;
  purpose?: string; groupSlug: string; groupName: string;
};

function format(dt: string) {
  const d = new Date(dt);
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

function getMonthMatrix(base = new Date()) {
  const y = base.getFullYear(), m = base.getMonth();
  const first = new Date(y, m, 1);
  const start = new Date(first); start.setDate(first.getDate() - ((first.getDay()+6)%7)); // 月曜始まり
  const weeks: Date[][] = [];
  for (let w=0; w<6; w++) {
    const row: Date[] = [];
    for (let i=0;i<7;i++) { row.push(new Date(start)); start.setDate(start.getDate()+1); }
    weeks.push(row);
  }
  return { weeks, month: m };
}

export default async function Home() {
  const me = await readUserFromCookie();
  if (!me) redirect('/login?next=/');

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/me/reservations`, { cache:'no-store' });
  const json = await res.json();
  const mine: Mine[] = (json?.data ?? []) as Mine[];

  // 直近順
  mine.sort((a,b)=> new Date(a.start).getTime() - new Date(b.start).getTime());
  const upcoming = mine.filter(r => new Date(r.end) >= new Date()).slice(0, 6);

  // カレンダー印用の yyyy-mm-dd セット
  const mark = new Set(
    mine.map(r => new Date(r.start))
        .map(d => `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`)
  );

  const { weeks, month } = getMonthMatrix(new Date());

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
        {/* 直近の予約 */}
        <section className={`md:col-span-2 ${card}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium">直近の自分の予約</div>
            <a className="text-sm text-gray-500 hover:underline" href="/groups">すべてのグループへ</a>
          </div>

          {!upcoming.length && (
            <div className="text-gray-500 text-sm">直近の予約はありません。右上の「グループ参加」から始めましょう。</div>
          )}

          <ul className="divide-y">
            {upcoming.map(r => (
              <li key={r.id} className="py-3 flex items-start gap-3">
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-black/80" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">
                    {format(r.start)} – {format(r.end)} （{r.groupName}）
                  </div>
                  <div className="font-medium">機器: {r.deviceId}</div>
                  {r.purpose && <div className="text-sm text-gray-500">用途: {r.purpose}</div>}
                </div>
                <a className="text-sm text-gray-500 hover:underline" href={`/groups/${r.groupSlug}`}>詳細</a>
              </li>
            ))}
          </ul>
        </section>

        {/* ミニカレンダー */}
        <section className={card}>
          <div className="font-medium mb-3">
            今月の予定 <span className="text-gray-400 text-sm">({month+1}月)</span>
          </div>
          <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-2">
            {['月','火','水','木','金','土','日'].map(d => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weeks.flat().map((d,i) => {
              const inMonth = d.getMonth() === month;
              const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
              const has = mark.has(key);
              return (
                <div key={i} className={`h-12 rounded-lg border text-sm flex items-center justify-center ${inMonth ? '' : 'bg-gray-50 text-gray-400'}`}>
                  <div className="relative">
                    {d.getDate()}
                    {has && <span className="absolute -right-2 -top-1 inline-block h-1.5 w-1.5 rounded-full bg-black" />}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
