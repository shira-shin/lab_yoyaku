export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { redirect } from 'next/navigation';
import { getUserFromCookies } from '@/lib/auth/server';
import NewGroupForm from './NewGroupForm';
import { unstable_noStore as noStore } from 'next/cache';
import { serverFetch } from '@/lib/http/serverFetch';
import { DB_NOT_INITIALIZED_ERROR } from '@/lib/db/constants';
import { Button } from '@/components/ui/Button';

export default async function NewGroupPage() {
  noStore();
  const user = await getUserFromCookies();
  if (!user) redirect('/login?next=/groups/new');

  let dbNotInitialized = false;
  let disabledReason: string | null = null;
  try {
    const res = await serverFetch('/api/groups?mine=1', { cache: 'no-store' });
    if (res.status === 503) {
      const payload = await res.json().catch(() => null);
      const code = payload?.error ?? payload?.code;
      if (code === DB_NOT_INITIALIZED_ERROR) {
        dbNotInitialized = true;
        disabledReason = 'データベースが初期化されていません。管理者に連絡してください。';
      }
    }
  } catch (error) {
    console.warn('[groups/new] failed to confirm db status', error);
  }

  const isPreview = process.env.VERCEL_ENV === 'preview';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">グループ作成</h1>
        <Button href="/" variant="ghost" size="sm">
          ホームに戻る
        </Button>
      </div>
      {dbNotInitialized && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <p className="font-semibold">データベースが初期化されていません。</p>
          <p className="mt-2 text-sm">
            管理者に連絡し、Prisma のマイグレーションを実行してテーブルを作成してください。
          </p>
          {isPreview && (
            <p className="mt-2 text-xs text-amber-800">
              プレビュー環境の場合は、Vercel の再デプロイ後に <code>RUN_MIGRATIONS=1</code> と
              <code>ALLOW_MIGRATE_ON_VERCEL=1</code> が有効になっているか確認してください。
            </p>
          )}
        </div>
      )}
      <NewGroupForm disabled={dbNotInitialized} disabledReason={disabledReason} />
    </div>
  );
}
