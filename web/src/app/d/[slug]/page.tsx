import { db } from '@/lib/mock-db';
import { notFound, redirect } from 'next/navigation';

export default function DeviceQRPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { t?: string };
}) {
  const token = searchParams?.t;
  const group = db.groups.find((g) => g.devices.some((d) => d.slug === params.slug));
  const device = group?.devices.find((d) => d.slug === params.slug);
  if (!group || !device || !token || token !== device.qrToken) {
    notFound();
  }
  redirect(`/groups/${group.slug}?device=${device.id}`);
}
