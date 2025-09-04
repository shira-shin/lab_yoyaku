export type MemberId = string;

export type Device = { id: string; name: string; note?: string };
export type Reservation = {
  id: string; deviceId: string; user: MemberId;
  start: string; end: string; purpose?: string;
  participants?: MemberId[];
  reminderMinutes?: number;
};
export type Group = {
  slug: string;
  name: string;
  password?: string;
  members: MemberId[];
  devices: Device[];
  reservations: Reservation[];
  reserveFrom?: string;
  reserveTo?: string;
  memo?: string;
  host?: MemberId;
};

/** ← 追加：ユーザー */
export type UserRecord = {
  id: string;
  email: string;
  name?: string;
  passHash: string; // sha256
};

type DB = { groups: Group[]; users: UserRecord[] };

const g = globalThis as any;
if (!g.__MOCK_DB__) g.__MOCK_DB__ = { groups: [], users: [] } as DB;

export function loadDB(): DB { return g.__MOCK_DB__ as DB; }
export function saveDB(_db: DB) { /* メモリなのでnoop */ }

export const uid = () =>
  'id_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36);

/** ざっくりemail判定 */
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
