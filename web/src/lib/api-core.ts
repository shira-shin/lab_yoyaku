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
    listReservations: (
      slug: string,
      options: {
        deviceSlug?: string;
        date?: string;
        from?: string;
        to?: string;
      } = {}
    ) => {
      const params = new URLSearchParams({ groupSlug: slug });
      if (options.deviceSlug) params.set('deviceSlug', options.deviceSlug);
      if (options.date) params.set('date', options.date);
      if (options.from) params.set('from', options.from);
      if (options.to) params.set('to', options.to);
      return api(`/api/reservations?${params.toString()}`);
    },
    createReservation: (body: any) =>
      api('/api/reservations', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    updateReservation: async (_body?: any): Promise<any> => {
      throw new Error('updateReservation is not implemented');
    },
    deleteReservation: async (_body?: any): Promise<any> => {
      throw new Error('deleteReservation is not implemented');
    },
    listMyReservations: () => api('/api/me/reservations'),
  };
}
