'use client';

import { useState } from 'react';
import Link from 'next/link';

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
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);
  const isHost = defaultReserver && group.host === defaultReserver;
  const firstDevice = devices[0];

  async function handleShareLink() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        /* noop */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert('リンクをコピーしました');
      } catch {
        alert('リンクのコピーに失敗しました');
      }
    }
  }

  async function handleDeleteDevice(device: { id: string; slug: string }) {
    if (!confirm('この機器を削除しますか？')) return;
    setRemovingSlug(device.slug);
    try {
      const r = await fetch(
        `/api/groups/${encodeURIComponent(group.slug)}/devices/${encodeURIComponent(device.slug)}`,
        {
          method: 'DELETE',
          credentials: 'same-origin',
        }
      );
      if (!r.ok) throw new Error('failed');
      setDevices((prev) => prev.filter((d) => d.id !== device.id));
    } catch (e) {
      alert('削除に失敗しました');
    } finally {
      setRemovingSlug(null);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <a href="/" className="text-sm text-indigo-600 hover:underline">&larr; ホームへ戻る</a>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{group.name}</h1>
          <div className="flex gap-2 flex-wrap justify-end">
            <Link
              href={`/groups/${encodeURIComponent(group.slug)}/reservations/new${
                firstDevice ? `?device=${encodeURIComponent(firstDevice.slug)}` : ''
              }`}
              className="btn btn-primary"
            >
              予約を追加
            </Link>
            <button onClick={handleShareLink} className="btn btn-secondary">
              リンクをコピー
            </button>
            {isHost && (
              <a
                href={`/groups/${encodeURIComponent(group.slug.toLowerCase())}/settings`}
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
          <Link
            href={`/groups/${encodeURIComponent(group.slug.toLowerCase())}/devices/new?next=${encodeURIComponent(`/groups/${group.slug.toLowerCase()}`)}`}
            className="btn btn-primary"
          >
            機器を追加
          </Link>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((d) => (
            <li
              key={d.id}
              className="border rounded-md p-4 shadow-card flex flex-col justify-between"
            >
              <div>
                <a
                  href={`/groups/${encodeURIComponent(group.slug.toLowerCase())}/devices/${d.slug}`}
                  className="font-medium hover:underline"
                >
                  {d.name}
                </a>
                <div className="text-xs text-neutral-500">ID: {d.id}</div>
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/groups/${encodeURIComponent(group.slug)}/reservations/new?device=${encodeURIComponent(
                    d.slug
                  )}`}
                  className="btn btn-secondary flex-1"
                >
                  予約
                </Link>
                <a
                  href={`/api/devices/${d.slug}/qr`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary flex-1"
                >
                  QRコード
                </a>
                <button
                  onClick={() => handleDeleteDevice(d)}
                  className="btn btn-danger flex-1"
                  disabled={removingSlug === d.slug}
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
