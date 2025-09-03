'use client';
import { useRouter } from 'next/navigation';
import React from 'react';

export default function BackButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  const router = useRouter();
  return (
    <button onClick={() => router.back()} className={className}>
      {children ?? '戻る'}
    </button>
  );
}
