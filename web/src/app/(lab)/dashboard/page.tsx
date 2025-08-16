import DeviceCard from '@/components/DeviceCard';

async function fetchDevices() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/devices`,
    { cache: 'no-store' }
  );
  return (await res.json()).devices as any[];
}

export default async function DashboardPage() {
  const devices = await fetchDevices();
  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">機器ダッシュボード</h1>
        <p className="text-sm text-neutral-600">QRからのディープリンク先: /devices/[uid]</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((d) => (
          <DeviceCard key={d.id} d={d} />
        ))}
      </div>
    </main>
  );
}
