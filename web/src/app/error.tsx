"use client";
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[GlobalError]", error, error.digest);
  return (
    <html>
      <body>
        <h2>エラーが発生しました</h2>
        <button onClick={() => reset()}>再試行</button>
      </body>
    </html>
  );
}
