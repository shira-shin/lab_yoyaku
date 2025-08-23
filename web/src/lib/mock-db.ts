export type DB = {
  groups: Array<{
    id: string;
    slug: string;
    name: string;
    passwordHash?: string;
    members: Array<{ id: string; name: string; role: 'admin' | 'member' }>;
    devices: Array<{ id: string; name: string; note?: string }>;
    reservations: Array<{
      id: string;
      deviceId: string;
      title?: string;
      reserver: string;     // 予約者名
      start: string;
      end: string;
      scope: 'group' | 'member';
      memberId?: string;
    }>;
  }>;
};

function initDb(): DB {
  return { groups: [] };
}

// ---- サーバ常駐メモリ(DB) ----
const g = globalThis as any;
if (!g.__labDb) g.__labDb = initDb();
export const db: DB = g.__labDb;

// 必要ならクライアント側で使う軽いミラーは別関数に逃がす
