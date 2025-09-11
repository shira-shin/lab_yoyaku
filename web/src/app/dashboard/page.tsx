import { readUserFromCookie } from '@/lib/auth';
import type { Span } from '@/components/CalendarWithBars';
import DashboardClient from './page.client';
import { serverFetch } from '@/lib/server-fetch';

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
export default async function DashboardPage() {
  const me = await readUserFromCookie();

  let upcoming: Mine[] = [];
  let spans: Span[] = [];
  let myGroups: { slug: string; name: string }[] = [];

  if (me) {
    const res = await serverFetch('/api/me/reservations');
    if (res.ok) {
      const json = await res.json();
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
    }

    const gRes = await serverFetch('/api/mock/groups?mine=1');
    if (gRes.ok) {
      const gJson = await gRes.json();
      myGroups = Array.isArray(gJson) ? gJson : gJson?.groups ?? [];
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <div className="flex gap-2">
          <a href="/groups/new" className="btn btn-primary">グループをつくる</a>
          <a href="/groups/join" className="btn btn-secondary">グループ参加</a>
        </div>
      </div>

      {me && myGroups.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">参加グループ</h2>
          <ul className="list-disc pl-5 space-y-1">
            {myGroups.map((g) => (
              <li key={g.slug}>
                <a
                  href={`/groups/${encodeURIComponent(g.slug.toLowerCase())}`}
                  className="text-blue-600 hover:underline"
                >
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

