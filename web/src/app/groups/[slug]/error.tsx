'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">エラーが発生しました</h2>
      <p className="text-sm text-zinc-600">{error.message}</p>
      <button onClick={() => reset()} className="rounded-xl px-3 py-1 border">
        再試行
      </button>
    </div>
  );
}
