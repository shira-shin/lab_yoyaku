function getBaseURL() {
  // 明示指定があれば最優先（本番やプロキシ環境）
  if (process.env.NEXT_PUBLIC_API_BASE) return process.env.NEXT_PUBLIC_API_BASE;

  // サーバー側（RSC/Route Handlers）では絶対URLが必要
  if (typeof window === 'undefined') {
    // 開発中のデフォルト。必要に応じて .env.local で上書き
    const internal = process.env.INTERNAL_API_BASE || 'http://localhost:3000';
    return internal;
  }

  // ブラウザでは相対URLでOK
  return '';
}

async function api(path: string, init?: RequestInit) {
  const base = getBaseURL();
  const url = `${base}${path}`;
  const res = await fetch(url, { ...init, cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${path} :: ${text || res.statusText}`);
  }
  return res.json();
}

// 以降のヘルパは全部 api('/api/mock/...') を使う
export const listGroups = () => api('/api/mock/groups');
export const createGroup = (body: any) =>
  api('/api/mock/groups', { method: 'POST', body: JSON.stringify(body) });
export const getGroup = (slug: string) => api(`/api/mock/groups/${slug}`);
export const joinGroup = (payload: any) =>
  api('/api/mock/groups/join', { method: 'POST', body: JSON.stringify(payload) });

export const listDevices = (slug: string) =>
  api(`/api/mock/devices?slug=${encodeURIComponent(slug)}`);
export const createDevice = (body: any) =>
  api('/api/mock/devices', { method: 'POST', body: JSON.stringify(body) });

export const listReservations = (slug: string, deviceId?: string) =>
  api(
    `/api/mock/reservations?slug=${encodeURIComponent(slug)}${
      deviceId ? `&deviceId=${encodeURIComponent(deviceId)}` : ''
    }`
  );
export const createReservation = (body: any) =>
  api('/api/mock/reservations', { method: 'POST', body: JSON.stringify(body) });
