'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'メンバー以外にも公開' },
  { value: 'MEMBERS_ONLY', label: 'メンバーにのみ公開' },
] as const;

const KIND_OPTIONS = [
  { value: 'DAY_SLOT', label: '日ごとに枠を作成' },
  { value: 'TIME_RANGE', label: '時間帯で枠を作成' },
] as const;

type Visibility = (typeof VISIBILITY_OPTIONS)[number]['value'];
type Kind = (typeof KIND_OPTIONS)[number]['value'];

export function CreateDutyTypeForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#7c3aed');
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC');
  const [kind, setKind] = useState<Kind>('DAY_SLOT');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('当番タイプ名を入力してください。');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/groups/${slug}/duties/types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          color: color?.trim() || undefined,
          visibility,
          kind,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? '作成に失敗しました');
      }

      setSuccess(true);
      setName('');
      setColor('#7c3aed');
      setVisibility('PUBLIC');
      setKind('DAY_SLOT');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-muted-foreground" htmlFor="name">
          当番タイプ名
        </label>
        <input
          id="name"
          name="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="例：朝当番"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-muted-foreground" htmlFor="color">
          カラー
        </label>
        <div className="flex items-center gap-3">
          <input
            id="color"
            name="color"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-10 w-16 cursor-pointer rounded border border-input"
          />
          <input
            type="text"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-muted-foreground">公開範囲</span>
        <div className="space-y-1">
          {VISIBILITY_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="visibility"
                value={option.value}
                checked={visibility === option.value}
                onChange={() => setVisibility(option.value)}
                className="h-4 w-4"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-muted-foreground">当番の作成方式</span>
        <div className="space-y-1">
          {KIND_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="kind"
                value={option.value}
                checked={kind === option.value}
                onChange={() => setKind(option.value)}
                className="h-4 w-4"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-emerald-600">当番タイプを作成しました。</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? '作成中…' : '当番タイプを作成'}
        </button>
        <button
          type="button"
          onClick={() => {
            setName('');
            setColor('#7c3aed');
            setVisibility('PUBLIC');
            setKind('DAY_SLOT');
            setError(null);
            setSuccess(false);
          }}
          disabled={submitting}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline disabled:cursor-not-allowed"
        >
          入力内容をリセット
        </button>
      </div>
    </form>
  );
}
