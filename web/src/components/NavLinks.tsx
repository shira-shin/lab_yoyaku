'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { signOut } from 'next-auth/react';

export default function NavLinks({ me, displayName }: { me: any; displayName?: string | null }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
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
  const userLabel =
    displayName || me?.name || (me?.email ? me.email.split('@')[0] : null);
  const userInitial = userLabel?.charAt(0)?.toUpperCase() ?? '👤';

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointer = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  return (
    <nav className="flex items-center gap-4 text-sm">
      <a className={linkClass('/usage')} href="/usage">使い方</a>
      <a className={linkClass('/groups/join')} href="/groups/join">グループ参加</a>
      {me ? (
        <>
          <a className={linkClass('/groups/new')} href="/groups/new">グループをつくる</a>
          <a className={linkClass('/dashboard')} href="/dashboard">ホーム</a>
          <a className={linkClass('/groups')} href="/groups">グループ</a>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-sm font-semibold"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="ユーザーメニュー"
            >
              {userInitial}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white text-gray-900 shadow-lg ring-1 ring-black/10 z-10">
                <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
                  {userLabel}
                </div>
                <a
                  href="/profile"
                  className="block px-4 py-2 hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  プロフィール
                </a>
                <a
                  href="/groups"
                  className="block px-4 py-2 hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  所属グループ
                </a>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-gray-50"
                  onClick={() => {
                    setMenuOpen(false);
                    void signOut({ callbackUrl: '/' });
                  }}
                >
                  サインアウト
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <a
          className="rounded-md bg-white/10 px-3 py-1 hover:bg-white/20"
          href="/signin"
        >
          サインイン
        </a>
      )}
    </nav>
  );
}
