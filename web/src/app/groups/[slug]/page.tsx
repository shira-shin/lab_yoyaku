import { listDevices, createDevice, listReservations, createReservation, getGroup } from '@/lib/api';
import { notFound } from 'next/navigation';

function MonthCalendar({
  year, month, reservations, onPickDate
}: {
  year: number; month: number; reservations: { byDate: Record<string, number> };
  onPickDate: (d: Date) => void;
}) {
  const first = new Date(year, month, 1);
  const startW = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startW; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="grid grid-cols-7 gap-2 border rounded-lg p-4">
      {['日','月','火','水','木','金','土'].map(w => (
        <div key={w} className="text-center text-sm font-medium text-neutral-600">{w}</div>
      ))}
      {cells.map((date, i) => {
        const key = date ? date.toISOString().slice(0,10) : `x-${i}`;
        const count = date ? reservations.byDate[key] || 0 : 0;
        return (
          <button
            key={key}
            disabled={!date}
            onClick={() => date && onPickDate(date)}
            className={`h-24 rounded border text-left p-2 ${date ? 'hover:bg-neutral-50' : 'bg-neutral-50/40 cursor-default'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm">{date?.getDate() ?? ''}</span>
              {date && count > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{count}</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default async function GroupPage({ params }: { params: { slug: string } }) {
  const groupRes = await getGroup(params.slug);
  const group = groupRes.data;
  if (!groupRes.ok || !group) return notFound();

  const devicesRes = await listDevices(group.slug);
  const devices = devicesRes.data || [];
  const today = new Date();
  const monthRes = await listReservations(group.slug);
  const monthReservations = monthRes.data || [];
  const byDate: Record<string, number> = {};
  monthReservations.forEach(r => {
    const key = r.start.slice(0,10);
    byDate[key] = (byDate[key] ?? 0) + 1;
  });

  return (
    <div className="max-w-4xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{group.name}</h1>
        <p className="text-sm text-neutral-500">slug: {group.slug}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">機器</h2>
        <ul className="space-y-2">
          {devices.map(d => (
            <li key={d.id} className="border rounded p-3">{d.name}
              <div className="text-xs text-neutral-500">ID: {d.id}</div>
            </li>
          ))}
        </ul>
        <DeviceCreateForm slug={group.slug} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">カレンダー</h2>
        <MonthCalendar
          year={today.getFullYear()}
          month={today.getMonth()}
          reservations={{ byDate }}
          onPickDate={(d) => {
            window.location.href = `/groups/${group.slug}?date=${d.toISOString().slice(0,10)}`;
          }}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">予約</h2>
        <ReservationForm slug={group.slug} devices={devices} />
      </section>
    </div>
  );
}

function DeviceCreateForm({ slug }: { slug: string }) {
  async function action(data: FormData) {
    'use server';
    const name = String(data.get('name') || '').trim();
    const note = String(data.get('note') || '').trim() || undefined;
    if (!name) return;
    await createDevice({ slug, name, note });
  }
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-2 max-w-xl">
      <input name="name" placeholder="例：蛍光測定器" className="input" />
      <input name="note" placeholder="備考（任意）" className="input" />
      <button className="btn-primary sm:col-span-2 w-24">追加</button>
    </form>
  );
}

function ReservationForm({ slug, devices }: { slug: string; devices: {id: string; name: string}[] }) {
  async function action(data: FormData) {
    'use server';
    const deviceId = String(data.get('deviceId') || '');
    const start = String(data.get('start') || '');
    const end   = String(data.get('end') || '');
    const title = String(data.get('title') || '').trim() || undefined;
    const reserver = String(data.get('reserver') || '').trim();
    if (!deviceId || !start || !end || !reserver) return;
    await createReservation({ slug, deviceId, start, end, title, reserver });
  }
  return (
    <form action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-3xl">
      <select name="deviceId" className="input" required>
        <option value="">機器を選択</option>
        {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <input name="reserver" placeholder="予約者名（必須）" className="input" required />
      <input type="datetime-local" name="start" className="input" required />
      <input type="datetime-local" name="end" className="input" required />
      <input name="title" placeholder="用途（任意）" className="input sm:col-span-2" />
      <button className="btn-primary w-28 sm:col-span-2">予約追加</button>
    </form>
  );
}
