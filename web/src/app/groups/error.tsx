'use client';
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-4 space-y-2">
      <p>エラーが発生しました。</p>
      <button className="btn btn-secondary" onClick={reset}>リトライ</button>
    </div>
  );
}
