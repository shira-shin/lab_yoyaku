import { loadDB } from '@/lib/mockdb';
import { notFound, redirect } from 'next/navigation';

export default function DeviceQRPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { t?: string };
}) {
  const token = searchParams?.t;
  const db = loadDB();
  const group = (db.groups as any).find((g: any) => (g.devices ?? []).some((d: any) => d.slug === params.slug));
  const device = group?.devices.find((d: any) => d.slug === params.slug);
  if (!group || !device || !token || token !== device.qrToken) {
    notFound();
  }
  redirect(`/groups/${group.slug}?device=${device.id}`);
}

