"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DB_NOT_INITIALIZED_ERROR } from "@/lib/db/constants";
import { Button } from "@/components/ui/Button";
import PasswordInput from "@/components/ui/PasswordInput";

export default function GroupJoinPage() {
  const searchParams = useSearchParams();
  const [group, setGroup] = useState(() => searchParams.get("slug") || "");
  const [passcode, setPasscode] = useState("");
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbNotInitialized, setDbNotInitialized] = useState(false);
  const [myGroupSlugs, setMyGroupSlugs] = useState<string[]>([]);
  const router = useRouter();

  const slugParam = searchParams.get("slug") || "";

  useEffect(() => {
    setGroup(slugParam);
  }, [slugParam]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/groups?mine=1", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!data || cancelled) return;
        const groups = Array.isArray(data?.groups)
          ? data.groups
          : Array.isArray(data?.data)
            ? data.data
            : [];
        const slugs = Array.isArray(groups)
          ? groups
              .map((g: any) => (typeof g?.slug === "string" ? g.slug.toLowerCase() : null))
              .filter((s): s is string => Boolean(s))
          : [];
        if (!cancelled) setMyGroupSlugs(slugs);
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedGroup = group.trim().toLowerCase();
  const alreadyMember = normalizedGroup ? myGroupSlugs.includes(normalizedGroup) : false;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    setDbNotInitialized(false);
    try {
      const slug = normalizedGroup;
      if (!slug) {
        setErr('グループの識別子を入力してください');
        return;
      }
      if (myGroupSlugs.includes(slug)) {
        router.push(`/groups/${encodeURIComponent(slug)}`);
        return;
      }
      const res = await fetch(`/api/groups/${encodeURIComponent(slug)}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ passcode: passcode || undefined }),
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.ok) {
        const code = payload?.code || payload?.error || 'join_failed';
        if (code === DB_NOT_INITIALIZED_ERROR) {
          setDbNotInitialized(true);
          setErr('データベースが初期化されていません。管理者に連絡してください。');
        } else {
          setErr(String(code));
        }
        return;
      }
      const nextSlug = payload?.data?.slug || slug;
      const normalizedNextSlug =
        typeof nextSlug === "string" ? nextSlug.trim().toLowerCase() : slug;
      if (payload?.already) {
        setMyGroupSlugs((prev) =>
          prev.includes(normalizedNextSlug) ? prev : [...prev, normalizedNextSlug],
        );
      }
      router.push(`/groups/${encodeURIComponent(nextSlug)}`);
    } catch (e: any) {
      setErr(e.message || '参加に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">グループに参加</h1>
        <Button href="/" variant="ghost" size="sm">
          ホームに戻る
        </Button>
      </div>
      <form onSubmit={onSubmit} className="space-y-5">
        <label className="block">
          <div className="mb-1">グループ slug</div>
          <input
            className="w-full rounded-xl border p-3"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            required
            aria-required="true"
          />
        </label>
        <label className="block">
          <div className="mb-1">パスコード（必要な場合）</div>
          <PasswordInput
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="w-full rounded-xl border p-3"
            autoComplete="off"
          />
        </label>
        {err && (
          <p className="text-red-600 text-sm" role="alert" aria-live="polite">
            {err}
          </p>
        )}
        {alreadyMember ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <p className="font-semibold">このグループには既に参加しています。</p>
            <p className="mt-1">
              <a
                className="text-emerald-700 underline"
                href={`/groups/${encodeURIComponent(normalizedGroup)}`}
              >
                グループページを開く
              </a>
            </p>
          </div>
        ) : (
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading || !group.trim() || dbNotInitialized}
            aria-disabled={loading || !group.trim() || dbNotInitialized}
            block
          >
            参加する
          </Button>
        )}
      </form>
      {dbNotInitialized && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <p className="font-semibold">データベースが初期化されていません。</p>
          <p className="mt-2 text-sm">
            管理者に連絡し、Prisma のマイグレーションを実行してテーブルを作成してください。
          </p>
        </div>
      )}
    </div>
  );
}

