"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignOutPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus(data?.error ?? "サインアウトに失敗しました");
        return;
      }
      setStatus("サインアウトしました");
      router.push("/signin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-md mx-auto py-16 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">サインアウト</h1>
        <p className="text-sm text-gray-600">
          下のボタンから現在のセッションを終了し、再度ログインページへ移動します。
        </p>
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={loading}
        className="inline-flex w-full justify-center rounded bg-black px-3 py-2 text-white disabled:opacity-60"
      >
        {loading ? "処理中..." : "サインアウト"}
      </button>

      {status ? (
        <p className="text-sm text-gray-500">{status}</p>
      ) : null}

      <div className="space-y-2 text-xs text-gray-500">
        <p>
          ブラウザのクッキーを削除してから再読み込みすると、強制的にサインアウトできます。
        </p>
        <p>
          サインアウト後にもう一度ログインする場合は <a href="/signin" className="text-blue-600 hover:underline">ログインページ</a>{" "}
          からお試しください。
        </p>
      </div>
    </main>
  );
}
