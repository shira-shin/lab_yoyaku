import Link from "next/link";
import { getDevices } from "@/lib/api";

export default async function Home() {
  const { devices } = await getDevices();
  return (
    <main className="app-container py-6">
      <h1>こんにちは Lab Yoyaku</h1>
      <p className="mt-4">
        <Link href="/dashboard" className="text-blue-600 underline">
          ダッシュボードへ
        </Link>
      </p>
      <div className="mt-6 space-y-2">
        <h2 className="font-semibold">最近の機器</h2>
        <ul className="list-disc pl-5 text-blue-600 underline">
          {devices.slice(0, 3).map((d: any) => (
            <li key={d.id}>
              <Link href={`/devices/${d.device_uid}`}>{d.name}</Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6">
        <button className="rounded-2xl border px-4 py-2" disabled>
          新規機器を登録（後で実装）
        </button>
      </div>
    </main>
  );
}
