'use client';
import { Button } from '@/components/ui/Button';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-4 space-y-2">
      <p>エラーが発生しました。</p>
      <Button type="button" variant="outline" onClick={reset} size="sm">
        リトライ
      </Button>
    </div>
  );
}
