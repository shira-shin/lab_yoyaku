import { readUserFromCookie } from '@/lib/auth';

export default async function Header() {
  const me = await readUserFromCookie();
  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-6 h-12 flex items-center justify-between">
        <a href="/" className="font-semibold tracking-tight">Lab Yoyaku</a>
        <nav className="flex items-center gap-4 text-sm">
          <a className="hover:underline" href="/usage">使い方</a>
          {me ? (
            <>
              <a className="hover:underline" href="/">ダッシュボード</a>
              <a className="hover:underline" href="/groups">グループ</a>
              <a className="hover:underline" href="/devices">機器</a>
              <span className="hidden sm:inline text-gray-500">{me.name || me.email}</span>
              <form action="/api/auth/logout" method="post">
                <button className="rounded border px-3 py-1 hover:bg-gray-50">ログアウト</button>
              </form>
            </>
          ) : (
            <>
              <a className="rounded border px-3 py-1 hover:bg-gray-50" href="/login?tab=login">ログイン</a>
              <a className="rounded border px-3 py-1 hover:bg-gray-50" href="/login?tab=register">新規作成</a>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
