'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function ReservationForm({
  groupSlug,
  devices,
  defaultReserver,
}: {
  groupSlug: string;
  devices: any[];
  defaultReserver?: string;
}) {
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

  async function handleAddReservation(e: React.FormEvent) {
    e.preventDefault();
    if (!deviceId || !start || !end || !reserver) return;
    setAddingReservation(true);
    setErrorMsg('');
    try {
      const me = await fetch('/api/auth/me', { cache: 'no-store' }).then((r) => r.json());
      const record = {
        groupSlug,
        deviceId,
        start,
        end,
        title: title || undefined,
        user: me.email,
        userName: me.name || me.email,
        participants: Array.from(new Set([me.email, me.name || me.email])),
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

  return (
    <form
      onSubmit={handleAddReservation}
      className="grid grid-cols-1 md:grid-cols-5 gap-3 max-w-5xl"
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
        className="input md:col-span-2"
      />
      <button
        type="submit"
        disabled={addingReservation}
        className="btn-primary md:col-span-5 md:w-40"
      >
        予約追加
      </button>
      {errorMsg && (
        <div className="text-sm text-red-600 md:col-span-5 whitespace-pre-wrap">
          {errorMsg}
        </div>
      )}
    </form>
  );
}

