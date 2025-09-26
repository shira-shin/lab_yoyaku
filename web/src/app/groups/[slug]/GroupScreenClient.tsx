'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Device = { id: string; slug: string; name: string };

type Group = {
  slug: string;
  name: string;
  host?: string | null;
  reserveFrom?: string | null;
  reserveTo?: string | null;
  memo?: string | null;
  viewerRole?: string | null;
  allowMemberDeviceCreate?: boolean;
};

export default function GroupScreenClient({
  initialGroup,
  initialDevices,
}: {
  initialGroup: Group;
  initialDevices: Device[];
}) {
  const group = initialGroup;
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const viewerRole: string | null = group.viewerRole ?? null;
  const canManageGroup = viewerRole === 'OWNER' || viewerRole === 'MANAGER';
  const canCreateDevice =
    canManageGroup || (group.allowMemberDeviceCreate && viewerRole === 'MEMBER');
  const canManageSettings = canManageGroup;
  const firstDevice = devices[0];

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-device-menu]')) return;
      setMenuOpenId(null);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

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

  async function handleDeleteDevice(device: Device) {
    if (!confirm('この機器を本当に削除しますか？')) return;
    setRemovingId(device.id);
    try {
      const res = await fetch(`/api/devices/${encodeURIComponent(device.id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('failed');
      setDevices((prev) => prev.filter((d) => d.id !== device.id));
      setMenuOpenId(null);
    } catch {
      alert('削除に失敗しました');
    } finally {
      setRemovingId(null);
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
            {canManageSettings && (
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
        {group.host && <p className="text-sm text-neutral-500">ホスト: {group.host}</p>}
      </header>

      {(group.reserveFrom || group.reserveTo || group.memo) && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">グループ情報</h2>
          {group.reserveFrom && <div>予約開始: {group.reserveFrom}</div>}
          {group.reserveTo && <div>予約終了: {group.reserveTo}</div>}
          {group.memo && <div className="whitespace-pre-wrap">{group.memo}</div>}
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">機器</h2>
          {canCreateDevice && (
            <Link
              href={`/groups/${encodeURIComponent(group.slug.toLowerCase())}/devices/new?next=${encodeURIComponent(`/groups/${group.slug.toLowerCase()}`)}`}
              className="btn btn-primary"
            >
              機器を追加
            </Link>
          )}
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => (
            <li key={device.id} className="border rounded-md p-4 shadow-card flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <a
                    href={`/groups/${encodeURIComponent(group.slug.toLowerCase())}/devices/${device.slug}`}
                    className="font-medium hover:underline"
                  >
                    {device.name}
                  </a>
                  <div className="text-xs text-neutral-500">ID: {device.id}</div>
                </div>
                {canManageGroup && (
                  <div className="relative" data-device-menu>
                    <button
                      type="button"
                      className="rounded-full border px-2 py-1 text-lg leading-none"
                      onClick={(event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        setMenuOpenId((prev) => (prev === device.id ? null : device.id));
                      }}
                    >
                      ︙
                    </button>
                    {menuOpenId === device.id && (
                      <div className="absolute right-0 mt-2 w-40 rounded-lg border bg-white shadow-lg z-10" data-device-menu>
                        <Link
                          href={`/groups/${encodeURIComponent(group.slug.toLowerCase())}/devices/${device.slug}`}
                          className="block px-4 py-2 text-sm hover:bg-neutral-100"
                          onClick={() => setMenuOpenId(null)}
                        >
                          編集
                        </Link>
                        <button
                          type="button"
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleDeleteDevice(device);
                          }}
                          disabled={removingId === device.id}
                        >
                          {removingId === device.id ? '削除中…' : '削除…'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/groups/${encodeURIComponent(group.slug)}/reservations/new?device=${encodeURIComponent(device.slug)}`}
                  className="btn btn-secondary flex-1"
                >
                  予約
                </Link>
                <a
                  href={`/api/devices/${device.slug}/qr`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary flex-1"
                >
                  QRコード
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
