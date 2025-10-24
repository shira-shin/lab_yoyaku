"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useMemo, useState } from "react";

type AuthTab = "login" | "register" | "forgot";

export default function LoginPage() {
  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => searchParams.get("next") ?? "/dashboard", [searchParams]);

  const resetFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  const handleLogin = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setFeedback(null);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setFeedback(data?.error ?? "ログインに失敗しました");
          return;
        }
        router.push(redirectTo);
        router.refresh();
      } finally {
        setLoading(false);
      }
    },
    [email, password, redirectTo, router],
  );

  const handleRegister = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (password !== confirmPassword) {
        setFeedback("パスワードが一致しません");
        return;
      }

      setLoading(true);
      setFeedback(null);
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setFeedback(data?.error ?? "登録に失敗しました");
          return;
        }
        router.push(redirectTo);
        router.refresh();
      } finally {
        setLoading(false);
      }
    },
    [confirmPassword, email, name, password, redirectTo, router],
  );

  const handleForgot = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setFeedback(null);
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setFeedback(data?.error ?? "送信に失敗しました");
          return;
        }
        setFeedback("パスワード再設定メールを送信しました（届かない場合は迷惑メールをご確認ください）");
      } finally {
        setLoading(false);
      }
    },
    [email],
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background text-foreground">
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-primary/10 grid place-items-center">
            <span className="text-2xl">🧪</span>
          </div>
          <h1 className="text-3xl font-bold">Lab Yoyaku へようこそ</h1>
          <p className="text-muted-foreground mt-2">
            研究室の機器をグループで管理し、予約と使用状況をカレンダーで可視化します。
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">できること</h2>
            <ol className="space-y-3 text-sm leading-6">
              <li>
                ① <span className="font-medium">グループを作成</span>
                ：研究室/班ごとに立ち上げ、メンバーを招待。
              </li>
              <li>
                ② <span className="font-medium">グループに参加</span>
                ：招待リンク/QRから参加。機器一覧とカレンダーを共有。
              </li>
              <li>
                ③ <span className="font-medium">機器登録と予約</span>
                ：機器ごとにQR発行。予約・使用中がひと目で分かる。
              </li>
            </ol>
            <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              メールアドレスとパスワードでログインできるようになりました。Google アカウントは不要です。
            </div>
          </div>

          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="border-b px-6 pt-4">
              <div className="flex gap-6">
                <button
                  type="button"
                  onClick={() => {
                    setTab("login");
                    resetFeedback();
                  }}
                  className={`px-1 pb-3 -mb-px border-b-2 font-medium transition-colors ${
                    tab === "login"
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ログイン
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("register");
                    resetFeedback();
                  }}
                  className={`px-1 pb-3 -mb-px border-b-2 font-medium transition-colors ${
                    tab === "register"
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  新規登録
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("forgot");
                    resetFeedback();
                  }}
                  className={`px-1 pb-3 -mb-px border-b-2 font-medium transition-colors ${
                    tab === "forgot"
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  パスワード再設定
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {feedback ? (
                <div className="rounded-md border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                  {feedback}
                </div>
              ) : null}

              {tab === "login" ? (
                <form className="space-y-3" onSubmit={handleLogin}>
                  <label className="block text-sm font-medium text-muted-foreground">
                    メールアドレス
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-xl border bg-background px-4 py-3"
                    />
                  </label>
                  <label className="block text-sm font-medium text-muted-foreground">
                    パスワード
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 w-full rounded-xl border bg-background px-4 py-3"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium disabled:opacity-60"
                  >
                    {loading ? "送信中..." : "ログイン"}
                  </button>
                </form>
              ) : null}

              {tab === "register" ? (
                <form className="space-y-3" onSubmit={handleRegister}>
                  <label className="block text-sm font-medium text-muted-foreground">
                    メールアドレス
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-xl border bg-background px-4 py-3"
                    />
                  </label>
                  <label className="block text-sm font-medium text-muted-foreground">
                    表示名（任意）
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full rounded-xl border bg-background px-4 py-3"
                      placeholder="例: 山田 太郎"
                    />
                  </label>
                  <label className="block text-sm font-medium text-muted-foreground">
                    パスワード（8文字以上）
                    <input
                      required
                      minLength={8}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 w-full rounded-xl border bg-background px-4 py-3"
                    />
                  </label>
                  <label className="block text-sm font-medium text-muted-foreground">
                    パスワード（確認）
                    <input
                      required
                      minLength={8}
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="mt-1 w-full rounded-xl border bg-background px-4 py-3"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium disabled:opacity-60"
                  >
                    {loading ? "送信中..." : "登録する"}
                  </button>
                </form>
              ) : null}

              {tab === "forgot" ? (
                <form className="space-y-3" onSubmit={handleForgot}>
                  <p className="text-sm text-muted-foreground">
                    登録済みのメールアドレスに、パスワード再設定リンクを送信します。
                  </p>
                  <label className="block text-sm font-medium text-muted-foreground">
                    メールアドレス
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-xl border bg-background px-4 py-3"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium disabled:opacity-60"
                  >
                    {loading ? "送信中..." : "再設定メールを送信"}
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
