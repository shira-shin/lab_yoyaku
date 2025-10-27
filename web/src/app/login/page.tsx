'use client';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { PASSWORD_HINT, passwordRegex } from '@/utils/password';

type Tab = 'login' | 'register';
const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@lab-yoyaku.example';

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
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showForgotHelp, setShowForgotHelp] = useState(false);

  // register
  const [rname, setRName] = useState('');
  const [remail, setREmail] = useState('');
  const [rpass, setRPass] = useState('');
  const [rpass2, setRPass2] = useState('');
  const [rerr, setRErr] = useState('');
  const [loadingReg, setLoadingReg] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegPassword2, setShowRegPassword2] = useState(false);

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setLErr('');
    setLoadingLogin(true);
    try {
      const normalizedEmail = lemail.trim().toLowerCase();
      const normalizedPassword = lpass.trim();
      if (!normalizedEmail || !normalizedPassword) {
        throw new Error('missing');
      }
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword }),
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error();
      router.replace(next || '/');
    } catch {
      setLErr('メールまたはパスワードが違います（大文字小文字は区別しません）');
    } finally {
      setLoadingLogin(false);
    }
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    setRErr('');
    const trimmedEmail = remail.trim().toLowerCase();
    const trimmedPass = rpass.trim();
    const trimmedPass2 = rpass2.trim();
    const trimmedName = rname.trim();
    if (trimmedPass !== trimmedPass2) {
      setRErr('確認用パスワードが一致しません');
      return;
    }
    if (!passwordRegex.test(trimmedPass)) {
      setRErr(PASSWORD_HINT);
      return;
    }
    setLoadingReg(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          password: trimmedPass,
          name: trimmedName,
        }),
        credentials: 'same-origin',
      });
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error('このメールは既に登録されています。ログインしてください');
        }
        throw new Error('登録に失敗しました');
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
  const passwordWrapper = 'relative flex items-center';
  const toggleButton =
    'absolute inset-y-0 right-2 flex items-center text-xs text-gray-600 hover:text-gray-900';

  return (
    <div className="max-w-6xl mx-auto py-10">
      <header className="text-center mb-8 space-y-3">
        <div className="flex items-center justify-center gap-3">
          <Image
            src="/brand/labyoyaku-icon.svg"
            alt="ラボ予約"
            width={52}
            height={52}
            className="rounded-2xl"
            priority
          />
          <span className="text-2xl font-semibold tracking-tight text-gray-900">ラボ予約</span>
        </div>
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
                type="email"
                placeholder="メールアドレス"
                value={lemail}
                onChange={e => {
                  setLEmail(e.target.value);
                  if (lerr) setLErr('');
                }}
                required
                autoComplete="email"
              />
              <div className={passwordWrapper}>
                <input
                  className={`${input} pr-16`}
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="パスワード"
                  value={lpass}
                  onChange={e => {
                    setLPass(e.target.value);
                    if (lerr) setLErr('');
                  }}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={toggleButton}
                  onClick={() => setShowLoginPassword(v => !v)}
                >
                  {showLoginPassword ? '隠す' : '表示'}
                </button>
              </div>
              {lerr && <div className="text-sm text-red-600">{lerr}</div>}
              <button
                className="w-full rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 px-4 py-2 disabled:opacity-60"
                disabled={loadingLogin}
              >
                {loadingLogin ? 'ログイン中…' : 'ログイン'}
              </button>
              <button
                type="button"
                className="w-full text-center text-sm text-indigo-600 hover:text-indigo-500 underline"
                onClick={() => setShowForgotHelp(v => !v)}
              >
                パスワードをお忘れの方はこちら
              </button>
              {showForgotHelp && (
                <div className="text-xs text-gray-600 rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                  <p>
                    パスワードを忘れてしまった場合は、グループ管理者にリセットを依頼するか、登録時のメールアドレスから以下のサポート宛にご連絡ください。
                  </p>
                  <p>
                    サポート連絡先：
                    <a className="ml-1 text-indigo-600 hover:text-indigo-500 underline" href={`mailto:${supportEmail}`}>
                      {supportEmail}
                    </a>
                  </p>
                </div>
              )}
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
                type="email"
                placeholder="メールアドレス"
                value={remail}
                onChange={e => {
                  setREmail(e.target.value);
                  if (rerr) setRErr('');
                }}
                required
                autoComplete="email"
              />
              <div className={passwordWrapper}>
                <input
                  className={`${input} pr-16`}
                  type={showRegPassword ? 'text' : 'password'}
                  placeholder="パスワード"
                  value={rpass}
                  onChange={e => {
                    setRPass(e.target.value);
                    if (rerr) setRErr('');
                  }}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={toggleButton}
                  onClick={() => setShowRegPassword(v => !v)}
                >
                  {showRegPassword ? '隠す' : '表示'}
                </button>
              </div>
              <div className={passwordWrapper}>
                <input
                  className={`${input} pr-16`}
                  type={showRegPassword2 ? 'text' : 'password'}
                  placeholder="パスワード（確認）"
                  value={rpass2}
                  onChange={e => {
                    setRPass2(e.target.value);
                    if (rerr) setRErr('');
                  }}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={toggleButton}
                  onClick={() => setShowRegPassword2(v => !v)}
                >
                  {showRegPassword2 ? '隠す' : '表示'}
                </button>
              </div>
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

