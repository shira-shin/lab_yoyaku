'use client';

import { useState } from 'react';

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
  const isHost = defaultReserver && group.host === defaultReserver;

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
      <header className="space-y-2">
        <a href="/" className="text-sm text-indigo-600 hover:underline">&larr; ホームへ戻る</a>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{group.name}</h1>
          <div className="flex gap-2 flex-wrap justify-end">
            <button onClick={handleLineShare} className="btn btn-ghost">
              LINEで共有
            </button>
            <button onClick={handleMailShare} className="btn btn-ghost">
              メールで共有
            </button>
            {isHost && (
              <a
                href={`/groups/${group.slug}/settings`}
                className="btn btn-secondary"
              >
                設定を変更
              </a>
            )}
          </div>
        </div>
        <p className="text-sm text-neutral-500">slug: {group.slug}</p>
        {group.host && (
          <p className="text-sm text-neutral-500">ホスト: {group.host}</p>
        )}
      </header>

      {(group.reserveFrom || group.reserveTo || group.memo) && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">グループ情報</h2>
          {group.reserveFrom && <div>予約開始: {group.reserveFrom}</div>}
          {group.reserveTo && <div>予約終了: {group.reserveTo}</div>}
          {group.memo && (
            <div className="whitespace-pre-wrap">{group.memo}</div>
          )}
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">機器</h2>
          <a
            href={`/devices/new?group=${encodeURIComponent(group.slug)}`}
            className="btn btn-primary"
          >
            機器を追加
          </a>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((d) => (
            <li
              key={d.id}
              className="border rounded-md p-4 shadow-card flex flex-col justify-between"
            >
              <div>
                <a
                  href={`/devices/${d.slug}`}
                  className="font-medium hover:underline"
                >
                  {d.name}
                </a>
                <div className="text-xs text-neutral-500">ID: {d.id}</div>
              </div>
              <div className="mt-3 flex gap-2">
                <a
                  href={`/api/mock/devices/${d.slug}/qr`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary flex-1"
                >
                  QRコード
                </a>
                <button
                  onClick={() => handleDeleteDevice(d.id)}
                  className="btn btn-danger flex-1"
                  disabled={removingId === d.id}
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// calendar removed; use CalendarWithBars at page level
