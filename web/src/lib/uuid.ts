let nodeRandomUUID: (() => string) | undefined;

// Node.js 18+ で利用可能な randomUUID を動的に取得
if ((globalThis as any).process?.versions?.node) {
  import('crypto')
    .then(({ randomUUID }) => {
      if (typeof randomUUID === 'function') nodeRandomUUID = randomUUID;
    })
    .catch(() => {});
}

export function uuid() {
  // ブラウザ/Node の crypto があれば利用
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  if (nodeRandomUUID) return nodeRandomUUID();
  // フォールバック
  const s = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  return s;
}
