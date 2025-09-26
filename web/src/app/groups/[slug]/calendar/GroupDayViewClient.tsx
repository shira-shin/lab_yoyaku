'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/lib/toast';

type Device = { id: string; slug: string; name: string };
type Reservation = {
  id: string;
  deviceId: string;
  deviceSlug: string;
  deviceName: string;
  start: string;
  end: string;
  purpose: string | null;
  userEmail: string;
  userName: string;
};

type DayViewResponse = {
  date: string;
  reservations: Reservation[];
  devices: Device[];
  viewerRole: string | null;
};

function formatTime(value: string) {
  const date = new Date(value);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function GroupDayViewClient({
  slug,
  date,
  groupName,
  initialData,
  viewerRole,
  currentUserEmail,
}: {
  slug: string;
  date: string;
  groupName: string;
  initialData: DayViewResponse;
  viewerRole: string | null | undefined;
  currentUserEmail: string;
}) {
  const router = useRouter();
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [data, setData] = useState<DayViewResponse>(initialData);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/groups/${encodeURIComponent(slug)}/reservations?date=${encodeURIComponent(date)}`,
          { credentials: 'same-origin' }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const message =
            (typeof body?.error === 'string' && body.error) || 'データの取得に失敗しました';
          throw new Error(message);
        }
        const json = (await res.json()) as DayViewResponse;
        if (!ignore) {
          setData(json);
        }
      } catch (error) {
        if (!ignore) {
          const message = error instanceof Error ? error.message : 'データの取得に失敗しました';
          toast.error(message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [slug, date, version]);

  const effectiveRole = data?.viewerRole ?? viewerRole ?? null;

  const grouped = useMemo(() => {
    const devices: Device[] = data?.devices ?? [];
    const reservations = data?.reservations ?? [];
    const map = new Map<string, Reservation[]>();
    reservations.forEach((reservation) => {
      if (!map.has(reservation.deviceId)) {
        map.set(reservation.deviceId, []);
      }
      map.get(reservation.deviceId)!.push(reservation);
    });
    return devices.map((device) => ({
      device,
      reservations: (map.get(device.id) ?? []).sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      ),
    }));
  }, [data, initialData.devices]);

  const filtered = useMemo(() => {
    if (selectedDevice === 'all') return grouped;
    return grouped.filter((item) => item.device.id === selectedDevice);
  }, [grouped, selectedDevice]);

  const titleDate = useMemo(() => {
    const d = new Date(date);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }, [date]);

  const prevDate = useMemo(() => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, [date]);

  const nextDate = useMemo(() => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, [date]);

  async function handleCancel(reservation: Reservation) {
    if (cancellingId) return;
    const allowed = reservation.userEmail === currentUserEmail || ['OWNER', 'MANAGER'].includes(effectiveRole ?? '');
    if (!allowed) return;
    const ok = window.confirm('この予約をキャンセルしますか？');
    if (!ok) return;
    setCancellingId(reservation.id);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (res.status === 204) {
        toast.success('予約をキャンセルしました');
        setVersion((prev) => prev + 1);
      } else if (res.status === 403) {
        toast.error('この予約をキャンセルする権限がありません');
      } else if (res.status === 400) {
        const body = await res.json().catch(() => ({}));
        const message =
          (typeof body?.error === 'string' && body.error) ||
          'この予約はキャンセルできません';
        toast.error(message);
      } else {
        toast.error('予約のキャンセルに失敗しました');
      }
    } catch (error) {
      toast.error('予約のキャンセルに失敗しました');
    } finally {
      setCancellingId(null);
    }
  }

  const newReservationLink = (device?: Device) => {
    const params = new URLSearchParams({ date });
    if (device) {
      params.set('device', device.slug);
    }
    return `/groups/${encodeURIComponent(slug)}/reservations/new?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-neutral-500">{groupName}</div>
          <h1 className="text-2xl font-bold">{titleDate}の予約</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/groups/${encodeURIComponent(slug)}/calendar?date=${prevDate}`)}
            className="btn btn-secondary"
          >
            前日
          </button>
          <button
            onClick={() => router.push(`/groups/${encodeURIComponent(slug)}/calendar?date=${nextDate}`)}
            className="btn btn-secondary"
          >
            翌日
          </button>
          <Link href={newReservationLink(selectedDevice === 'all' ? undefined : filtered[0]?.device)} className="btn btn-primary">
            この日を予約
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="text-sm text-neutral-600">
            {loading ? '読み込み中…' : `${data?.reservations.length ?? 0}件の予約`}
          </div>
          <label className="text-sm">
            <span className="mr-2">機器で絞り込む</span>
            <select
              value={selectedDevice}
              onChange={(event) => setSelectedDevice(event.target.value)}
              className="input"
            >
              <option value="all">すべて</option>
              {grouped.map(({ device }) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filtered.length === 0 || filtered.every(({ reservations }) => reservations.length === 0) ? (
          <div className="text-sm text-neutral-500">この日の予約はありません。</div>
        ) : (
          <div className="space-y-6">
            {filtered.map(({ device, reservations }) => (
              <section key={device.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{device.name}</h2>
                  <Link
                    href={newReservationLink(device)}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    この機器を予約
                  </Link>
                </div>
                {reservations.length === 0 ? (
                  <div className="text-sm text-neutral-400">予約はありません。</div>
                ) : (
                  <ul className="space-y-3">
                    {reservations.map((reservation) => {
                      const isOwner = reservation.userEmail === currentUserEmail;
                      const canCancel =
                        isOwner || ['OWNER', 'MANAGER'].includes(effectiveRole ?? '');
                      return (
                        <li
                          key={reservation.id}
                          className="border rounded-xl p-4 flex flex-wrap md:flex-nowrap md:items-center gap-3 justify-between"
                        >
                          <div>
                            <div className="font-medium text-base">
                              {formatTime(reservation.start)} – {formatTime(reservation.end)}
                            </div>
                            <div className="text-sm text-neutral-600">
                              予約者: <span className="font-medium">{reservation.userName}</span>
                            </div>
                            {reservation.purpose ? (
                              <div className="text-sm text-neutral-500 mt-1">
                                用途: {reservation.purpose}
                              </div>
                            ) : null}
                          </div>
                          {canCancel ? (
                            <button
                              onClick={() => handleCancel(reservation)}
                              className="btn btn-danger"
                              disabled={cancellingId === reservation.id}
                            >
                              {cancellingId === reservation.id ? 'キャンセル中…' : 'キャンセル'}
                            </button>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
