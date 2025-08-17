import DeviceCard from "@/components/DeviceCard";
import { getDevices } from "@/lib/api";

export default async function DashboardPage() {
  const { devices } = await getDevices();
  return (
    <main className="app-container py-6">
      <h1 className="mb-4 text-2xl font-bold">機器ダッシュボード</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map((d: any) => (
          <DeviceCard key={d.id} d={d} />
        ))}
      </div>
    </main>
  );
}
