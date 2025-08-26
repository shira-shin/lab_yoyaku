'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createDevice, listDevices } from '@/lib/api';

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
  const [deviceName, setDeviceName] = useState('');
  const [note, setNote] = useState('');
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [addingDevice, setAddingDevice] = useState(false);

  const [deviceId, setDeviceId] = useState('');
  const reserver = defaultReserver || '';
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [title, setTitle] = useState('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [addingReservation, setAddingReservation] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const preselect = searchParams.get('device');
    if (preselect) setDeviceId(preselect);
  }, [searchParams]);


  async function handleAddDevice() {
    if (!deviceName.trim()) return;
    setAddingDevice(true);
    setDeviceError(null);
    try {
      await createDevice({ slug: group.slug, name: deviceName, note });
      const updated = await listDevices(group.slug);
      setDevices(updated.data || []);
      setDeviceName('');
      setNote('');
    } catch (err: any) {
      setDeviceError(err?.message || 'Failed to add device');
    } finally {
      setAddingDevice(false);
    }
  }

  async function handleAddReservation(e: React.FormEvent) {
    e.preventDefault();
    if (!deviceId || !start || !end || !reserver) return;
    setAddingReservation(true);
    setErrorMsg('');
    try {
      const payload = {
        groupSlug: group.slug,
        deviceId,
        start,
        end,
        title: title || undefined,
      };
      const r = await fetch('/api/mock/reservations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
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

  return (
    <div className="max-w-4xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{group.name}</h1>
        <p className="text-sm text-neutral-500">slug: {group.slug}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">機器</h2>
        <ul className="space-y-2">
          {devices.map((d) => (
            <li
              key={d.id}
              className="border rounded p-3 flex items-center justify-between"
            >
              <div>
                {d.name}
                <div className="text-xs text-neutral-500">ID: {d.id}</div>
              </div>
              <a
                href={`/api/mock/devices/${d.slug}/qr`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                QRコード
              </a>
            </li>
          ))}
        </ul>
        <div className="grid gap-2 sm:grid-cols-2 max-w-xl">
          <input
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="例：蛍光測定器"
            className="input"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="備考（任意）"
            className="input"
          />
          <button
            onClick={handleAddDevice}
            disabled={addingDevice}
            className="btn-primary sm:col-span-2 w-24"
          >
            追加
          </button>
          {deviceError && (
            <div className="text-sm text-red-600 sm:col-span-2">{deviceError}</div>
          )}
        </div>
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
