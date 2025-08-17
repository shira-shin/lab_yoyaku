import DeviceCard from "@/components/DeviceCard";
async function fetchDevices() {
  const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/devices`, { cache: 'no-store' });
  return (await r.json()).devices as any[];
}
export default async function DashboardPage() {
  const devices = await fetchDevices();
  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">機器ダッシュボード</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((d: any) => <DeviceCard key={d.id} d={d} />)}
      </div>
    </main>
  );
}
