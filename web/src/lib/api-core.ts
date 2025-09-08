export function createApi(getBaseURL: () => string) {
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

  return {
    listGroups: () => api('/api/me/groups'),
    createGroup: (body: any) =>
      api('/api/me/groups', { method: 'POST', body: JSON.stringify(body) }),
    getGroup: (slug: string) => api(`/api/mock/groups/${slug}`),
    joinGroup: (payload: any) =>
      api('/api/mock/groups/join', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    listDevices: (slug: string) =>
      api(`/api/mock/devices?slug=${encodeURIComponent(slug)}`),
    createDevice: (body: any) =>
      api('/api/mock/devices', { method: 'POST', body: JSON.stringify(body) }),
    listReservations: (slug: string, deviceId?: string) =>
      api(
        `/api/mock/reservations?slug=${encodeURIComponent(slug)}${
          deviceId ? `&deviceId=${encodeURIComponent(deviceId)}` : ''
        }`
      ),
    createReservation: (body: any) =>
      api('/api/mock/reservations', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    updateReservation: (body: any) =>
      api('/api/mock/reservations', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    deleteReservation: (body: any) =>
      api('/api/mock/reservations', {
        method: 'DELETE',
        body: JSON.stringify(body),
      }),
    listMyReservations: (from?: string, limit?: number) =>
      api(
        `/api/mock/reservations?me=1${
          from ? `&from=${encodeURIComponent(from)}` : ''
        }${limit ? `&limit=${limit}` : ''}`
      ),
  };
}
