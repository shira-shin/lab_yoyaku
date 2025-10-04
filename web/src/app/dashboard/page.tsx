export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

import { readUserFromCookie } from '@/lib/auth';
import type { Span } from '@/components/CalendarWithBars';
import DashboardClient from './page.client';
import { serverFetch } from '@/lib/http/serverFetch';
import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';

type Mine = {
  id:string; deviceId:string; deviceName?:string; userEmail:string; userName?:string;
  participants?: string[];
  start:string; end:string; startsAtUTC?:string; endsAtUTC?:string;
  purpose?:string; groupSlug:string; groupName:string;
  user?: { id?: string | null; name?: string | null; email?: string | null } | null;
};

export default async function DashboardPage() {
  noStore();
  const me = await readUserFromCookie();
  if (!me) redirect('/login?next=/dashboard');

  let upcoming: Mine[] = [];
  let spans: Span[] = [];
  let myGroups: { slug: string; name: string }[] = [];

  const res = await serverFetch('/api/me/reservations?take=50', { cache: 'no-store' });
  if (res.status === 401) redirect('/login?next=/dashboard');
  if (!res.ok) redirect('/login?next=/dashboard');

  const json = await res.json();
  const upcomingRaw: Mine[] = json?.data ?? [];
  upcomingRaw.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  upcoming = upcomingRaw.slice(0, 10);

  const mineAll = json?.all ?? [];
  const nameOf = (r: any) => {
    const email: string | undefined = r.user?.email ?? r.userEmail ?? undefined;
    if (me && email && email === me.email) return me.name || email.split('@')[0];
    return r.user?.name || r.userName || (email ? email.split('@')[0] : '');
  };
  spans = mineAll.map((r: any) => {
    const deviceName = r.deviceName ?? r.deviceId;
    return {
      id: r.id,
      name: deviceName,
      start: new Date(r.startsAtUTC ?? r.start),
      end: new Date(r.endsAtUTC ?? r.end),
      groupSlug: r.groupSlug,
      by: nameOf(r),
      participants: r.participants ?? [],
      device: r.deviceId ? { id: r.deviceId, name: deviceName } : null,
    } satisfies Span;
  });

  const gRes = await serverFetch('/api/groups?mine=1');
  if (gRes.status === 401) redirect('/login?next=/dashboard');
  if (gRes.ok) {
    const gJson = await gRes.json();
    myGroups = Array.isArray(gJson) ? gJson : gJson?.groups ?? [];
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

