export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

import { unstable_noStore as noStore } from 'next/cache';
import { redirect, notFound } from 'next/navigation';
import { getUserFromCookies } from '@/lib/auth/server';
import { serverFetch } from '@/lib/http/serverFetch';
import GroupDayViewClient from './GroupDayViewClient';

function normalizeDate(value?: string | string[] | null): string {
  if (!value) {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  }
  const str = Array.isArray(value) ? value[0] : value;
  if (!str) {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  }
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export default async function GroupCalendarDayPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  noStore();
  const slug = params.slug.toLowerCase();
  const user = await getUserFromCookies();
  if (!user) {
    redirect(`/login?next=/groups/${encodeURIComponent(slug)}/calendar`);
  }

  const date = normalizeDate(searchParams?.date);

  const groupRes = await serverFetch(`/api/groups/${encodeURIComponent(slug)}`);
  if (groupRes.status === 401) {
    redirect(`/login?next=/groups/${encodeURIComponent(slug)}/calendar`);
  }
  if (groupRes.status === 403) {
    redirect(`/groups/join?slug=${encodeURIComponent(slug)}`);
  }
  if (groupRes.status === 404) {
    return notFound();
  }
  if (!groupRes.ok) {
    redirect(`/login?next=/groups/${encodeURIComponent(slug)}/calendar`);
  }
  const groupJson = await groupRes.json();
  const group = groupJson?.group ?? groupJson;

  const reservationsRes = await serverFetch(
    `/api/groups/${encodeURIComponent(slug)}/reservations?date=${encodeURIComponent(date)}`
  );
  if (reservationsRes.status === 401) {
    redirect(`/login?next=/groups/${encodeURIComponent(slug)}/calendar`);
  }
  if (reservationsRes.status === 403) {
    redirect(`/groups/join?slug=${encodeURIComponent(slug)}`);
  }
  if (reservationsRes.status === 404) {
    return notFound();
  }
  if (!reservationsRes.ok) {
    redirect(`/login?next=/groups/${encodeURIComponent(slug)}/calendar`);
  }
  const reservationsJson = await reservationsRes.json();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <GroupDayViewClient
        slug={slug}
        date={date}
        groupName={group?.name ?? slug}
        initialData={reservationsJson}
        viewerRole={group?.viewerRole ?? reservationsJson?.viewerRole ?? null}
        currentUserEmail={user.email}
      />
    </div>
  );
}
