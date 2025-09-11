import { readUserFromCookie } from '@/lib/auth';
import type { Span } from '@/components/CalendarWithBars';
import DashboardClient from './page.client';
import { serverGet } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

type Mine = {
  id:string; deviceId:string; deviceName?:string; user:string; userName?:string;
  participants?: string[];
  start:string; end:string; purpose?:string; groupSlug:string; groupName:string;
};

function colorFromString(s:string){
  const palette=['#2563eb','#16a34a','#f59e0b','#ef4444','#7c3aed','#0ea5e9','#f97316','#14b8a6'];
  let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0;
  return palette[h%palette.length];
}
export default async function Home() {
  const me = await readUserFromCookie();

  let upcoming: Mine[] = [];
  let spans: Span[] = [];
  let myGroups: { slug: string; name: string }[] = [];

  if (me) {
    const json = await serverGet<{ data: Mine[]; all: any[] }>(
      '/api/me/reservations'
    );

    const upcomingRaw: Mine[] = json?.data ?? [];
    upcomingRaw.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
    upcoming = upcomingRaw.slice(0, 10);

    const mineAll = json?.all ?? [];
    spans = mineAll.map((r: any) => ({
      id: r.id,
      name: r.deviceName ?? r.deviceId,
      start: new Date(r.start),
      end: new Date(r.end),
      color: colorFromString(r.deviceId),
      groupSlug: r.groupSlug,
      by: r.userName || r.user,
      participants: r.participants ?? [],
    }));

    myGroups =
      (await serverGet<{ slug: string; name: string }[]>(
        '/api/me/groups'
      )) ?? [];
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <div className="flex gap-2">
          <a href="/groups/new" className="rounded-lg border px-3 py-2 bg-primary text-white hover:bg-primary-dark">グループをつくる</a>
          <a href="/groups/join" className="rounded-lg border border-primary text-primary px-3 py-2 hover:bg-primary/10">グループ参加</a>
        </div>
      </div>

      {me && myGroups.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">参加グループ</h2>
          <ul className="list-disc pl-5 space-y-1">
            {myGroups.map((g) => (
              <li key={g.slug}>
                <a href={`/groups/${g.slug}`} className="text-blue-600 hover:underline">
                  {g.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DashboardClient
        initialItems={upcoming}
        initialSpans={spans}
        isLoggedIn={!!me}
      />
    </div>
  );
}

