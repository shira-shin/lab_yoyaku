"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/dashboard";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background text-foreground">
      {/* ヒーロー */}
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
          {/* 左：できること */}
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">できること</h2>
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
          </div>

          {/* 右：ログインカード */}
          <div className="rounded-2xl border bg-card p-0 overflow-hidden">
            <div className="border-b px-6 pt-4">
              <div className="flex gap-6">
                <button className="px-1 pb-3 -mb-px border-b-2 border-foreground font-medium">
                  ログイン
                </button>
                <button className="px-1 pb-3 -mb-px border-b-2 border-transparent text-muted-foreground">
                  新規作成
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <input
                type="email"
                placeholder="メールアドレス"
                className="w-full rounded-xl border bg-background px-4 py-3"
              />
              <input
                type="password"
                placeholder="パスワード"
                className="w-full rounded-xl border bg-background px-4 py-3"
              />
              <button className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium">
                ログイン
              </button>

              <p className="text-center text-xs text-muted-foreground">
                テスト: <span className="font-mono">demo / demo</span> でもログインできます。
              </p>

              <button
                onClick={() => signIn("google", { callbackUrl: next })}
                className="w-full rounded-xl bg-foreground text-background py-3 font-medium inline-flex items-center justify-center gap-3"
              >
                <svg width="18" height="18" viewBox="0 0 533.5 544.3" aria-hidden>
                  <path
                    d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.3H272v95.1h146.9c-6.3 34.2-25.2 63.2-53.7 82.6v68h86.8c50.8-46.8 81.5-115.8 81.5-195.4z"
                    fill="#4285F4"
                  />
                  <path
                    d="M272 544.3c73.7 0 135.6-24.4 180.8-66.5l-86.8-68c-24.1 16.2-55 25.8-94 25.8-72 0-133-48.6-154.8-114.2H27.9v71.7C72.7 485.5 164.8 544.3 272 544.3z"
                    fill="#34A853"
                  />
                  <path
                    d="M117.2 321.4c-8.3-24.7-8.3-51.6 0-76.3V173.4H27.9c-38.7 77.4-38.7 169.9 0 247.3l89.3-69.3z"
                    fill="#FBBC04"
                  />
                  <path
                    d="M272 107.7c39.9-.6 77.7 14.5 106.7 41.9l79.4-79.4C407.5 24.3 345.6 0 272 0 164.8 0 72.7 58.8 27.9 151.2l89.3 71.7C139 156.6 200 108.1 272 107.7z"
                    fill="#EA4335"
                  />
                </svg>
                Googleでログイン
              </button>

              <div className="text-center">
                <a href="/api/auth/error" className="text-xs text-muted-foreground underline">
                  Google ログインのトラブルシューティング
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
