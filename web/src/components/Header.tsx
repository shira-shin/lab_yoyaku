import { readUserFromCookie } from '@/lib/auth';

export default async function Header() {
  const me = await readUserFromCookie();
  return (
    <header className="border-b">
      <div className="mx-auto max-w-5xl px-4 h-12 flex items-center justify-between">
        <a href="/" className="font-semibold">Lab Yoyaku</a>
        <nav className="flex items-center gap-6 text-sm">
          {me && <>
            <a href="/">ダッシュボード</a>
            <a href="/groups">グループ</a>
            <form action="/api/auth/logout" method="post">
              <button className="text-gray-600 hover:underline">ログアウト</button>
            </form>
          </>}
          {!me && <a href="/login">ログイン</a>}
        </nav>
      </div>
    </header>
  );
}

