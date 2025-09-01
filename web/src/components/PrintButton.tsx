'use client';

export default function PrintButton({ className }: { className?: string }) {
  return (
    <button onClick={() => window.print()} className={className}>
      印刷
    </button>
  );
}
