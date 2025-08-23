export function uuid() {
  // ブラウザ/Node の crypto があれば利用
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  try {
    // Node 18+ ならこれで通る
    const { randomUUID } = require('crypto');
    if (randomUUID) return randomUUID();
  } catch {}
  // フォールバック
  const s = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  return s;
}
