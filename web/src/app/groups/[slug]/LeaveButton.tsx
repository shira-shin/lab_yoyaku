"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function LeaveButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function leave() {
    if (leaving) return;
    if (!confirm("このグループを退出しますか？")) return;
    setLeaving(true);
    try {
      const res = await fetch(`/api/groups/${encodeURIComponent(slug)}/leave`, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: '退出に失敗しました' }));
        alert(error || '退出に失敗しました');
        return;
      }
      router.push('/groups');
      router.refresh();
    } catch (error: any) {
      alert(error?.message || '退出に失敗しました');
    } finally {
      setLeaving(false);
    }
  }

  return (
    <Button onClick={leave} disabled={leaving} variant="danger" loading={leaving}>
      グループを退出
    </Button>
  );
}
