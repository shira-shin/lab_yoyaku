import { readUserFromCookie } from '@/lib/auth';

export default async function Header() {
  const me = await readUserFromCookie();
  return (
    <header className="bg-primary text-white shadow">
      <div className="mx-auto max-w-6xl px-6 h-12 flex items-center justify-between">
        <a href="/" className="font-semibold tracking-tight">Lab Yoyaku</a>
        <nav className="flex items-center gap-4 text-sm">
          <a className="hover:underline" href="/usage">使い方</a>
          <a className="hover:underline" href="/groups/join">グループ参加</a>
          {me ? (
            <>
              <a className="hover:underline" href="/groups/new">グループ作成</a>
              <a className="hover:underline" href="/">ダッシュボード</a>
              <a className="hover:underline" href="/groups">グループ</a>
              <span className="hidden sm:inline text-white/80">
                {me.name || me.email}
              </span>
              <form action="/api/auth/logout" method="post">
                <button className="rounded-md bg-white/10 px-3 py-1 hover:bg-white/20">
                  ログアウト
                </button>
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
      </div>
    </header>
  );
}

