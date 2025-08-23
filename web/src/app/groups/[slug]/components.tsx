'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

export function DevicesSection({ slug }: { slug: string }) {
  const [list, setList] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    const d = await api(`/api/mock/groups/${slug}/devices`);
    setList(d);
  }
  useEffect(() => { load(); }, [slug]);

  async function addDevice(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      await api(`/api/mock/groups/${slug}/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), note }),
      });
      setName(''); setNote('');
      load();
    } catch (e: any) { setErr(e?.message ?? '保存に失敗しました'); }
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">機器</h2>
      <ul className="mb-4 space-y-2">
        {list.map(d => (
          <li key={d.id} className="rounded border p-3">
            <div className="font-medium">{d.name}</div>
            {d.note && <div className="text-sm text-gray-500">{d.note}</div>}
            <div className="text-xs text-gray-400">ID: {d.id}</div>
          </li>
        ))}
        {!list.length && <div className="text-gray-500">まだ登録がありません。</div>}
      </ul>

      <form onSubmit={addDevice} className="space-y-2 max-w-md">
        <div className="font-medium">機器を登録</div>
        <input className="w-full rounded border px-3 py-2" placeholder="例：蛍光測定器"
               value={name} onChange={e=>setName(e.target.value)} required />
        <input className="w-full rounded border px-3 py-2" placeholder="備考（任意）"
               value={note} onChange={e=>setNote(e.target.value)} />
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button className="rounded bg-black text-white px-4 py-2">追加</button>
      </form>
    </section>
  );
}

export function ReservationsSection({ slug, members }:{ slug:string; members:string[] }) {
  const [devices, setDevices] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState('');

  const [deviceId, setDeviceId] = useState('');
  const [user, setUser] = useState(members[0] ?? '');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [purpose, setPurpose] = useState('');

  async function load() {
    const [d, r] = await Promise.all([
      api(`/api/mock/groups/${slug}/devices`),
      api(`/api/mock/groups/${slug}/reservations`),
    ]);
    setDevices(d); setRows(r);
    if (!deviceId && d[0]) setDeviceId(d[0].id);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug]);

  async function createReservation(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      await api(`/api/mock/groups/${slug}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, user, start, end, purpose }),
      });
      setPurpose(''); setStart(''); setEnd('');
      load();
    } catch (e: any) { setErr(e?.message ?? '予約に失敗しました'); }
  }

  const rowsSorted = useMemo(
    () => [...rows].sort((a,b)=> new Date(a.start).getTime() - new Date(b.start).getTime()),
    [rows]
  );

  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">予約</h2>

      <form onSubmit={createReservation} className="grid gap-2 md:grid-cols-2 max-w-3xl mb-5">
        <select className="rounded border px-3 py-2" value={deviceId} onChange={e=>setDeviceId(e.target.value)} required>
          {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="rounded border px-3 py-2" value={user} onChange={e=>setUser(e.target.value)} required>
          {members.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input type="datetime-local" className="rounded border px-3 py-2" value={start} onChange={e=>setStart(e.target.value)} required />
        <input type="datetime-local" className="rounded border px-3 py-2" value={end} onChange={e=>setEnd(e.target.value)} required />
        <input className="md:col-span-2 rounded border px-3 py-2" placeholder="用途（任意）" value={purpose} onChange={e=>setPurpose(e.target.value)} />
        {err && <div className="md:col-span-2 text-sm text-red-600">{err}</div>}
        <div className="md:col-span-2">
          <button className="rounded bg-black text-white px-4 py-2">予約追加</button>
        </div>
      </form>

      <div className="space-y-2">
        {rowsSorted.map(r => {
          const d = devices.find(x => x.id === r.deviceId);
          return (
            <div key={r.id} className="rounded border p-3">
              <div className="font-medium">{d?.name ?? r.deviceId}</div>
              <div className="text-sm text-gray-600">
                {new Date(r.start).toLocaleString()} – {new Date(r.end).toLocaleString()} / 利用者: {r.user}
              </div>
              {r.purpose && <div className="text-sm text-gray-500">目的: {r.purpose}</div>}
            </div>
          );
        })}
        {!rowsSorted.length && <div className="text-gray-500">まだ予約がありません。</div>}
      </div>
    </section>
  );
}
