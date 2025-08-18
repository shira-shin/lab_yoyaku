import Link from "next/link";

export default function NotFound() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">ページが見つかりません</h1>
      <p className="text-neutral-600">お探しのページは存在しないか、移動した可能性があります。</p>
      <Link href="/" className="text-blue-600 hover:underline">
        トップへ戻る
      </Link>
    </main>
  );
}
