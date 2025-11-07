"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PasswordInput from "@/components/ui/PasswordInput";

type ResetPasswordFormProps = {
  initialToken?: string;
};

export default function ResetPasswordForm({ initialToken = "" }: ResetPasswordFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = useMemo(() => searchParams.get("token") ?? initialToken, [initialToken, searchParams]);
  const [token, setToken] = useState(tokenParam);
  useEffect(() => {
    setToken(tokenParam);
  }, [tokenParam]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!token) {
        setFeedback("無効なリンクです。再度メールのリンクを開き直してください。");
        return;
      }
      if (password !== confirmPassword) {
        setFeedback("パスワードが一致しません");
        return;
      }
      if (password.length < 8) {
        setFeedback("パスワードは8文字以上にしてください");
        return;
      }

      setLoading(true);
      setFeedback(null);
      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword: password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setFeedback(data?.error ?? "パスワードの更新に失敗しました");
          return;
        }
        setFeedback("パスワードを更新しました。ログインしてください。");
        router.push("/login");
        router.refresh();
      } finally {
        setLoading(false);
      }
    },
    [confirmPassword, password, router, token],
  );

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background text-foreground">
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold mb-6">パスワード再設定</h1>
        <p className="text-sm text-muted-foreground mb-6">
          メールで届いたリンクからアクセスした場合、自動的にトークンが入力されています。
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-muted-foreground">
            トークン
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-1 w-full rounded-xl border bg-background px-4 py-3 text-sm"
            />
          </label>

          <label className="block text-sm font-medium text-muted-foreground">
            新しいパスワード（8文字以上）
            <PasswordInput
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border bg-background px-4 py-3"
              containerClassName="mt-1"
              autoComplete="new-password"
            />
          </label>

          <label className="block text-sm font-medium text-muted-foreground">
            新しいパスワード（確認）
            <PasswordInput
              minLength={8}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border bg-background px-4 py-3"
              containerClassName="mt-1"
              autoComplete="new-password"
            />
          </label>

          {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium disabled:opacity-60"
          >
            {loading ? "送信中..." : "パスワードを更新"}
          </button>
        </form>
      </div>
    </main>
  );
}
