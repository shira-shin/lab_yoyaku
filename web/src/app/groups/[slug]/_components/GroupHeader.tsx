import Link from 'next/link';
import { prisma } from '@/src/lib/prisma';
import { getServerSession } from '@/lib/auth';

export default async function GroupHeader({ slug }: { slug: string }) {
  const session = await getServerSession();
  const normalizedSlug = slug.toLowerCase();
  const group = await prisma.group.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true, name: true, hostEmail: true, slug: true },
  });

  const isOwner =
    !!session?.user?.email &&
    !!group?.hostEmail &&
    session.user.email.toLowerCase() === group.hostEmail.toLowerCase();

  if (!group) {
    return null;
  }

  return (
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-xl font-semibold">{group.name ?? group.slug}</h1>
      {isOwner && (
        <Link
          href={`/groups/${encodeURIComponent(group.slug)}/admin`}
          className="rounded-lg bg-purple-600 text-white px-3 py-2 text-sm"
        >
          ホスト専用ページ
        </Link>
      )}
    </div>
  );
}
