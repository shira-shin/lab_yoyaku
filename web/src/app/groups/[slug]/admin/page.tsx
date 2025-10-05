import Link from 'next/link';
import { prisma } from '@/src/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { normalizeEmail } from '@/lib/email';
import PasswordPanel from './PasswordPanel';
import CopyButton from './CopyButton';

export const dynamic = 'force-dynamic';

function sanitizeBaseUrl(value: string | undefined | null) {
  if (!value) return '';
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export default async function AdminPage({ params }: { params: { slug: string } }) {
  const session = await getServerSession();
  const rawSlug = params?.slug ?? '';
  const decodedSlug = (() => {
    try {
      return decodeURIComponent(rawSlug);
    } catch {
      return rawSlug;
    }
  })();
  const slug = decodedSlug.toLowerCase();

  const group = await prisma.group.findUnique({
    where: { slug },
    include: {
      members: {
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!group) {
    return <div className="p-6">グループが見つかりません。</div>;
  }

  const sessionEmail = session?.user?.email ? normalizeEmail(session.user.email) : null;
  if (!sessionEmail || sessionEmail !== normalizeEmail(group.hostEmail ?? '')) {
    return <div className="p-6">権限がありません（ホストのみ）。</div>;
  }

  const baseUrl = sanitizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL);
  const inviteLink = `${baseUrl}/groups/${encodeURIComponent(group.slug)}/join`;

  const members = group.members.map((member) => {
    const email = member.email;
    const fallbackName = email ? email.split('@')[0] : '-';
    return {
      id: member.id,
      name: member.user?.name ?? fallbackName,
      email,
      role: member.role,
    };
  });

  return (
    <div className="p-6 space-y-6">
      <nav className="text-sm text-gray-500">
        <Link href="/groups" className="underline">
          グループ一覧
        </Link>
        {' / '}
        <Link href={`/groups/${encodeURIComponent(group.slug)}`} className="underline">
          {group.name ?? group.slug}
        </Link>
        {' / '}
        <span className="font-semibold text-gray-800">ホスト専用ページ</span>
      </nav>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">グループ情報</h2>
        <div>名前：{group.name ?? group.slug}</div>
        <div>
          slug：<code>{group.slug}</code> <CopyButton text={group.slug} />
        </div>
        <div>
          招待リンク：
          <code className="break-all">{inviteLink}</code> <CopyButton text={inviteLink} />
        </div>
        <div>メンバー数：{members.length}</div>
      </section>

      <PasswordPanel slug={group.slug} hasPassword={Boolean(group.passcode)} />

      <section className="rounded-xl border p-4">
        <h2 className="font-semibold mb-3">メンバー一覧</h2>
        <div className="overflow-x-auto">
          <table className="min-w-[600px] w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">名前</th>
                <th className="py-2">メール</th>
                <th className="py-2">役割</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b">
                  <td className="py-2">{member.name}</td>
                  <td className="py-2">{member.email}</td>
                  <td className="py-2">{member.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
