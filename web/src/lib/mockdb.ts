export type MemberId = string;

export type Device = {
  id: string;
  name: string;
  note?: string;
};

export type Reservation = {
  id: string;
  deviceId: string;
  user: MemberId;       // 誰が使うか
  start: string;        // ISO文字列
  end: string;          // ISO文字列
  purpose?: string;
};

export type Group = {
  slug: string;
  name: string;
  password?: string;
  members: MemberId[];
  devices: Device[];
  reservations: Reservation[];
};

type DB = { groups: Group[] };

const g = globalThis as any;
if (!g.__MOCK_DB__) g.__MOCK_DB__ = { groups: [] } as DB;

export function loadDB(): DB {
  return g.__MOCK_DB__ as DB;
}
export function saveDB(_db: DB) { /* メモリなのでnoop */ }

export const uid = () =>
  'id_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36);

// 予約の重複判定
export function overlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}
