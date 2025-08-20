export function uid() {
  try {
    if (
      typeof globalThis !== 'undefined' &&
      globalThis.crypto &&
      'randomUUID' in globalThis.crypto
    ) {
      // @ts-ignore
      return globalThis.crypto.randomUUID();
    }
  } catch {}
  return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

