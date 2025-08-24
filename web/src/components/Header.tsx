import { readUserFromCookie } from '@/lib/auth';

export default async function Header() {
  const me = await readUserFromCookie();
  return (
    <header className="border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 h-12 flex items-center justify-between">
        <a href="/" className="font-extrabold tracking-tight">Lab Yoyaku</a>
        <nav className="flex items-center gap-3 text-sm">
          {me ? (
            <>
              <a className="hover:underline" href="/">ダッシュボード</a>
              <a className="hover:underline" href="/groups">グループ</a>
              <span className="hidden sm:inline text-gray-500">/ {me.name || me.email}</span>
              <form action="/api/auth/logout" method="post">
                <button className="rounded-full px-3 py-1 border hover:bg-gray-50">ログアウト</button>
              </form>
            </>
          ) : (
            <a className="rounded-full px-3 py-1 border hover:bg-gray-50" href="/login">ログイン</a>
          )}
        </nav>
      </div>
    </header>
  );
}
