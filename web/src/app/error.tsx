"use client";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">エラーが発生しました</h1>
      <p className="text-neutral-600">{error.message}</p>
      <button
        onClick={reset}
        className="rounded border px-4 py-2"
      >
        再試行
      </button>
    </main>
  );
}
