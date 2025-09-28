'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type DutyType = {
  id: string;
  name: string;
  color?: string | null;
  kind: 'DAY_SLOT' | 'TIME_RANGE';
  visibility: 'PUBLIC' | 'MEMBERS_ONLY';
};

export function GenerateDutiesForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [seed, setSeed] = useState<string>('');
  const [types, setTypes] = useState<DutyType[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingTypes(true);
      try {
        const response = await fetch(`/api/duty-types?groupSlug=${encodeURIComponent(slug)}`);
        if (!response.ok) {
          throw new Error('当番タイプの取得に失敗しました');
        }
        const data: DutyType[] = await response.json();
        if (!cancelled) {
          setTypes(data);
          setSelected((prev) => {
            if (Object.keys(prev).length > 0) return prev;
            const initial: Record<string, boolean> = {};
            data.forEach((type) => {
              initial[type.id] = true;
            });
            return initial;
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '当番タイプの取得に失敗しました');
        }
      } finally {
        if (!cancelled) {
          setLoadingTypes(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, value]) => value).map(([key]) => key),
    [selected],
  );

  const handleToggle = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      if (!from || !to) {
        throw new Error('期間を入力してください');
      }
      const response = await fetch(`/api/groups/${slug}/duties/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to,
          typeIds: selectedIds.length > 0 ? selectedIds : undefined,
          seed: seed.trim() ? Number(seed) : undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? '自動割当に失敗しました');
      }
      const data = await response.json();
      setResult(data?.created ?? 0);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '自動割当に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-muted-foreground" htmlFor="from">
            開始日
          </label>
          <input
            id="from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-muted-foreground" htmlFor="to">
            終了日
          </label>
          <input
            id="to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-muted-foreground" htmlFor="seed">
          シャッフルシード（任意）
        </label>
        <input
          id="seed"
          type="number"
          inputMode="numeric"
          value={seed}
          onChange={(event) => setSeed(event.target.value)}
          placeholder="空の場合は現在時刻を使用"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">対象の当番タイプ</p>
        {loadingTypes ? (
          <p className="text-sm text-muted-foreground">読み込み中…</p>
        ) : types.length === 0 ? (
          <p className="text-sm text-muted-foreground">当番タイプが見つかりません。先に作成してください。</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {types.map((type) => (
              <label
                key={type.id}
                className="flex items-start gap-3 rounded-md border border-border bg-background p-3 shadow-sm hover:border-primary"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={!!selected[type.id]}
                  onChange={() => handleToggle(type.id)}
                />
                <span className="text-sm">
                  <span className="font-medium">{type.name}</span>
                  <span className="ml-2 inline-flex items-center rounded-full border px-2 text-xs">
                    {type.kind === 'DAY_SLOT' ? '日別枠' : '時間帯枠'}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {result !== null && !error && (
        <p className="text-sm text-emerald-600">{result} 件の当番枠を作成・更新しました。</p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={submitting || loadingTypes || types.length === 0}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? '割当中…' : '自動割当を実行'}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            setFrom(new Date().toISOString().slice(0, 10));
            setTo(new Date().toISOString().slice(0, 10));
            setSeed('');
            setSelected({});
            setResult(null);
            setError(null);
          }}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline disabled:cursor-not-allowed"
        >
          入力内容をリセット
        </button>
      </div>
    </form>
  );
}
