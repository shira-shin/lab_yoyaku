export function createApi(
  getBaseURL: () => string,
  getInit?: () => RequestInit
) {
  async function api(path: string, init?: RequestInit) {
    const base = getBaseURL();
    const url = `${base}${path}`;
    const extra = getInit?.() ?? {};
    const headers = {
      ...(extra.headers || {}),
      ...(init?.headers || {}),
    } as HeadersInit;
    const res = await fetch(url, {
      cache: 'no-store',
      ...extra,
      ...init,
      headers,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API ${res.status} ${path} :: ${text || res.statusText}`);
    }
    return res.json();
  }

  return {
    listGroups: () => api('/api/groups'),
    createGroup: (body: any) =>
      api('/api/groups', { method: 'POST', body: JSON.stringify(body) }),
    getGroup: (slug: string) => api(`/api/groups/${slug}`),
    joinGroup: (payload: any) =>
      api('/api/groups/join', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    listDevices: (slug: string) =>
      api(`/api/groups/${encodeURIComponent(slug)}/devices`),
    createDevice: (slug: string, body: any) =>
      api(`/api/groups/${encodeURIComponent(slug)}/devices`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    listReservations: (slug: string, deviceId?: string) =>
      api(
        `/api/reservations?group=${encodeURIComponent(slug)}${
          deviceId ? `&device=${encodeURIComponent(deviceId)}` : ''
        }`
      ),
    createReservation: (body: any) =>
      api('/api/reservations', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    updateReservation: () => {
      throw new Error('updateReservation is not implemented');
    },
    deleteReservation: () => {
      throw new Error('deleteReservation is not implemented');
    },
    listMyReservations: () => api('/api/me/reservations'),
  };
}
