'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function GroupScreenClient({
  initialGroup,
  initialDevices,
  defaultReserver,
}: {
  initialGroup: any;
  initialDevices: any[];
  defaultReserver?: string;
}) {
  const group = initialGroup;
  const [devices, setDevices] = useState<any[]>(initialDevices);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [deviceId, setDeviceId] = useState('');
  const reserver = defaultReserver || '';
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [title, setTitle] = useState('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [addingReservation, setAddingReservation] = useState(false);

  const [reserveFrom, setReserveFrom] = useState(group.reserveFrom || '');
  const [reserveTo, setReserveTo] = useState(group.reserveTo || '');
  const [memo, setMemo] = useState(group.memo || '');
  const [savingSettings, setSavingSettings] = useState(false);
  const isHost = defaultReserver && group.host === defaultReserver;

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const preselect = searchParams.get('device');
    if (preselect) setDeviceId(preselect);
  }, [searchParams]);


  async function handleAddReservation(e: React.FormEvent) {
    e.preventDefault();
    if (!deviceId || !start || !end || !reserver) return;
    setAddingReservation(true);
    setErrorMsg('');
    try {
      const me = await fetch('/api/auth/me', { cache: 'no-store' }).then((r) =>
        r.json()
      );

      const record = {
        groupSlug: group.slug,
        deviceId,
        start,
        end,
        title: title || undefined,
        user: me.email,
        userName: me.name || me.email,
        participants: Array.from(
          new Set([me.email, me.name || me.email])
        ),
      };

      const r = await fetch('/api/mock/reservations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(record),
      });

      if (r.status === 409) {
        const { conflicts } = await r.json();
        const lines = conflicts
          .map((c: any) => {
            const s = new Date(c.start), e = new Date(c.end);
            const pad = (n: number) => n.toString().padStart(2, '0');
            const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
            return `・${c.deviceName}（${hhmm(s)}–${hhmm(e)}）`;
          })
          .join('\n');
        setErrorMsg(`この時間は他の予約があります。\n${lines}`);
        return;
      }

      if (!r.ok) {
        setErrorMsg('保存に失敗しました');
        return;
      }

      router.refresh();
      setDeviceId('');
      setStart('');
      setEnd('');
      setTitle('');
    } catch (err: any) {
      setErrorMsg(err?.message || '保存に失敗しました');
    } finally {
      setAddingReservation(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const r = await fetch(`/api/mock/groups/${group.slug}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          reserveFrom: reserveFrom || undefined,
          reserveTo: reserveTo || undefined,
          memo: memo || undefined,
        }),
      });
      if (!r.ok) throw new Error('failed');
      router.refresh();
    } catch {
      alert('保存に失敗しました');
    } finally {
      setSavingSettings(false);
    }
  }

  function handleLineShare() {
    const url = window.location.href;
    window.open(
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
      '_blank'
    );
  }

  function handleMailShare() {
    const url = window.location.href;
    const subject = `${group.name}の共有`;
    window.open(
      `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(url)}`
    );
  }

  async function handleDeleteDevice(id: string) {
    if (!confirm('この機器を削除しますか？')) return;
    setRemovingId(id);
    try {
      const r = await fetch('/api/mock/devices', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: group.slug, id }),
      });
      if (!r.ok) throw new Error('failed');
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      alert('削除に失敗しました');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{group.name}</h1>
          <div className="flex gap-2">
            <button
              onClick={handleLineShare}
              className="px-2 py-1 border rounded"
            >
              LINEで共有
            </button>
            <button
              onClick={handleMailShare}
              className="px-2 py-1 border rounded"
            >
              メールで共有
            </button>
          </div>
        </div>
        <p className="text-sm text-neutral-500">slug: {group.slug}</p>
        {group.host && (
          <p className="text-sm text-neutral-500">ホスト: {group.host}</p>
        )}
      </header>

      {isHost ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">グループ設定</h2>
          <form onSubmit={handleSaveSettings} className="space-y-2 max-w-md">
            <label className="block">
              <div className="mb-1">予約開始（任意）</div>
              <input
                type="datetime-local"
                value={reserveFrom}
                onChange={(e) => setReserveFrom(e.target.value)}
                className="input"
              />
            </label>
            <label className="block">
              <div className="mb-1">予約終了（任意）</div>
              <input
                type="datetime-local"
                value={reserveTo}
                onChange={(e) => setReserveTo(e.target.value)}
                className="input"
              />
            </label>
            <label className="block">
              <div className="mb-1">メモ（任意）</div>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="input"
              />
            </label>
            <button type="submit" disabled={savingSettings} className="btn-primary">
              保存
            </button>
          </form>
        </section>
      ) : (
        (group.reserveFrom || group.reserveTo || group.memo) && (
          <section className="space-y-2">
            <h2 className="text-xl font-semibold">グループ情報</h2>
            {group.reserveFrom && <div>予約開始: {group.reserveFrom}</div>}
            {group.reserveTo && <div>予約終了: {group.reserveTo}</div>}
            {group.memo && (
              <div className="whitespace-pre-wrap">{group.memo}</div>
            )}
          </section>
        )
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">機器</h2>
        <ul className="space-y-2">
          {devices.map((d) => (
            <li
              key={d.id}
              className="border rounded p-3 flex items-center justify-between"
            >
              <div>
                <a href={`/devices/${d.slug}`} className="font-medium hover:underline">
                  {d.name}
                </a>
                <div className="text-xs text-neutral-500">ID: {d.id}</div>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/api/mock/devices/${d.slug}/qr`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  QRコード
                </a>
                <button
                  onClick={() => handleDeleteDevice(d.id)}
                  className="btn-danger"
                  disabled={removingId === d.id}
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
        <a
          href={`/devices/new?group=${encodeURIComponent(group.slug)}`}
          className="btn-primary inline-block"
        >
          機器を追加
        </a>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">予約</h2>
        <form
          onSubmit={handleAddReservation}
          className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-3xl"
        >
          <select
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            className="input"
            required
          >
            <option value="">機器を選択</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="input"
            required
          />
          <input
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="input"
            required
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="用途（任意）"
            className="input sm:col-span-2"
          />
          <button
            type="submit"
            disabled={addingReservation}
            className="btn-primary w-28 sm:col-span-2"
          >
            予約追加
          </button>
          {errorMsg && (
            <div className="text-sm text-red-600 sm:col-span-2 whitespace-pre-wrap">{errorMsg}</div>
          )}
        </form>
      </section>
    </div>
  );
}

// calendar removed; use CalendarWithBars at page level
