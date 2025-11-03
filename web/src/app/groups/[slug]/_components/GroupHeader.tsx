import { prisma } from '@/server/db/prisma';
import { getAuthContext } from '@/lib/auth-legacy';
import { normalizeEmail } from '@/lib/email';
import { Button } from '@/components/ui/Button';

export default async function GroupHeader({ slug }: { slug: string }) {
  const auth = await getAuthContext();
  const normalizedSlug = slug.toLowerCase();
  const group = await prisma.group.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true, name: true, hostEmail: true, slug: true },
  });

  const isOwner =
    !!auth?.user?.email &&
    !!group?.hostEmail &&
    normalizeEmail(auth.user.email) === normalizeEmail(group.hostEmail);

  if (!group) {
    return null;
  }

  return (
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-xl font-semibold">{group.name ?? group.slug}</h1>
      {isOwner && (
        <Button href={`/groups/${encodeURIComponent(group.slug)}/admin`} variant="primary" size="sm">
          ホスト専用ページ
        </Button>
      )}
    </div>
  );
}
