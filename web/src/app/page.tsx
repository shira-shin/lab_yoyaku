import Link from 'next/link';

export default function Home() {
  return (
    <main className="p-6">
      <h1>こんにちは Lab Yoyaku</h1>
      <p className="mt-4">
        <Link href="/(lab)/dashboard" className="text-blue-600 underline">
          ダッシュボードへ
        </Link>
      </p>
    </main>
  );
}
