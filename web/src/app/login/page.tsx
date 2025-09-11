'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { PASSWORD_HINT, passwordRegex } from '@/utils/password';

type Tab = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/';
  const [tab, setTab] = useState<Tab>('login');

  // login
  const [lemail, setLEmail] = useState('');
  const [lpass, setLPass] = useState('');
  const [lerr, setLErr] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);

  // register
  const [rname, setRName] = useState('');
  const [remail, setREmail] = useState('');
  const [rpass, setRPass] = useState('');
  const [rpass2, setRPass2] = useState('');
  const [rerr, setRErr] = useState('');
  const [loadingReg, setLoadingReg] = useState(false);

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setLErr('');
    setLoadingLogin(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lemail, password: lpass }),
      });
      if (!res.ok) throw new Error();
      router.replace(next || '/');
    } catch {
      setLErr('メールまたはパスワードが違います');
    } finally {
      setLoadingLogin(false);
    }
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    setRErr('');
    if (rpass !== rpass2) {
      setRErr('確認用パスワードが一致しません');
      return;
    }
    if (!passwordRegex.test(rpass)) {
      setRErr(PASSWORD_HINT);
      return;
    }
    setLoadingReg(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: remail, password: rpass, name: rname }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(/already/.test(t) ? 'このメールは登録済みです' : '登録に失敗しました');
      }
      router.replace('/');
    } catch (e: any) {
      setRErr(e?.message ?? '登録に失敗しました');
    } finally {
      setLoadingReg(false);
    }
  }

  const card =
    'rounded-xl border border-gray-200 bg-white p-5 shadow-sm';
  const input =
    'w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-800/10';

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Lab Yoyaku へようこそ</h1>
        <p className="text-gray-600 mt-2">研究室の機器をグループで管理し、予約と使用状況をカレンダーで可視化します。</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 左：説明（落ち着いた説明だけ） */}
        <section className={card}>
          <h2 className="font-medium mb-3">できること</h2>
          <ol className="space-y-3 text-sm text-gray-700">
            <li>
              <span className="font-medium">① グループを作成：</span> 研究室/班ごとに立ち上げ、メンバーを招待。
            </li>
            <li>
              <span className="font-medium">② グループに参加：</span> 招待リンク/QRから参加。機器一覧とカレンダーを共有。
            </li>
            <li>
              <span className="font-medium">③ 機器登録と予約：</span> 機器ごとにQR発行。予約・使用中がひと目で分かる。
            </li>
          </ol>
        </section>

        {/* 右：認証カード（タブは線のみ） */}
        <section className={card}>
          <div className="flex gap-6 border-b mb-4">
            <button
              className={`pb-2 text-sm ${
                tab === 'login'
                  ? 'border-b-2 border-gray-900 font-semibold'
                  : 'text-gray-500'
              }`}
              onClick={() => setTab('login')}
            >
              ログイン
            </button>
            <button
              className={`pb-2 text-sm ${
                tab === 'register'
                  ? 'border-b-2 border-gray-900 font-semibold'
                  : 'text-gray-500'
              }`}
              onClick={() => setTab('register')}
            >
              新規作成
            </button>
          </div>

          {tab === 'login' && (
            <form onSubmit={submitLogin} className="space-y-3">
              <input
                className={input}
                placeholder="メールアドレス"
                value={lemail}
                onChange={e => setLEmail(e.target.value)}
                required
              />
              <input
                className={input}
                type="password"
                placeholder="パスワード"
                value={lpass}
                onChange={e => setLPass(e.target.value)}
                required
              />
              {lerr && <div className="text-sm text-red-600">{lerr}</div>}
              <button
                className="w-full rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 px-4 py-2 disabled:opacity-60"
                disabled={loadingLogin}
              >
                {loadingLogin ? 'ログイン中…' : 'ログイン'}
              </button>
              <p className="text-xs text-muted text-center">デモ: <b>demo / demo</b> でもログインできます。</p>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={submitRegister} className="space-y-3">
              <input
                className={input}
                placeholder="表示名（任意）"
                value={rname}
                onChange={e => setRName(e.target.value)}
              />
              <input
                className={input}
                placeholder="メールアドレス"
                value={remail}
                onChange={e => setREmail(e.target.value)}
                required
              />
              <input
              className={input}
                type="password"
                placeholder="パスワード"
                value={rpass}
                onChange={e => setRPass(e.target.value)}
                required
              />
              <input
                className={input}
                type="password"
                placeholder="パスワード（確認）"
                value={rpass2}
                onChange={e => setRPass2(e.target.value)}
                required
              />
              <p className="text-sm text-muted mt-1">{PASSWORD_HINT}</p>
              {rerr && <div className="text-sm text-red-600">{rerr}</div>}
              <button
                className="w-full rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 px-4 py-2 disabled:opacity-60"
                disabled={loadingReg}
              >
                {loadingReg ? '作成中…' : 'アカウントを作成'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

