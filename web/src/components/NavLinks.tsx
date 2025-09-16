'use client';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

export default function NavLinks({ me, displayName }: { me: any; displayName?: string | null }) {
  const pathname = usePathname();
  const linkClass = (href: string) =>
    clsx(
      'rounded-md px-3 py-1 hover:bg-white/20',
      href === '/dashboard'
        ? pathname === '/' || pathname.startsWith('/dashboard')
          ? 'underline underline-offset-8'
          : undefined
        : pathname === href || pathname.startsWith(href + '/')
        ? 'underline underline-offset-8'
        : undefined
    );
  return (
    <nav className="flex items-center gap-4 text-sm">
      <a className={linkClass('/usage')} href="/usage">使い方</a>
      <a className={linkClass('/groups/join')} href="/groups/join">グループ参加</a>
      {me ? (
        <>
          <a className={linkClass('/groups/new')} href="/groups/new">グループをつくる</a>
          <a className={linkClass('/dashboard')} href="/dashboard">ホーム</a>
          <a className={linkClass('/groups')} href="/groups">グループ</a>
          <span className="hidden sm:inline text-white/80">
            {displayName || me.name || me.email.split('@')[0]}
          </span>
          <form action="/api/auth/logout" method="post">
            <button className="rounded-md bg-white/10 px-3 py-1 hover:bg-white/20">ログアウト</button>
          </form>
        </>
      ) : (
        <>
          <a
            className="rounded-md bg-white/10 px-3 py-1 hover:bg-white/20"
            href="/login?tab=login"
          >
            ログイン
          </a>
          <a
            className="rounded-md bg-accent px-3 py-1 text-white hover:bg-accent/90"
            href="/login?tab=register"
          >
            新規作成
          </a>
        </>
      )}
    </nav>
  );
}
