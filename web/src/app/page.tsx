import Link from "next/link";

export default function Home() {
  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">こんにちは Lab Yoyaku</h1>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          ダッシュボードへ
        </Link>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">最近の機器</h2>
        <ul className="list-disc pl-5 space-y-2 text-blue-700">
          <li>
            <Link href="/devices/JR-PAM-01" className="hover:underline">
              ジュニアPAM
            </Link>
          </li>
          <li>
            <Link href="/devices/PCR-02" className="hover:underline">
              PCR (Thermal Cycler)
            </Link>
          </li>
          <li>
            <Link href="/devices/GC-01" className="hover:underline">
              GC-MS
            </Link>
          </li>
        </ul>
      </div>

      <div>
        <button
          type="button"
          className="inline-flex items-center rounded-2xl border px-5 py-3 text-sm font-medium shadow-sm hover:-translate-y-0.5 hover:shadow transition"
          disabled
          title="後で実装"
        >
          新規機器を登録（後で実装）
        </button>
      </div>
    </section>
  );
}

