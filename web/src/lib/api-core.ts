export function createApi(
  getBaseURL: () => string,
  getInit?: () => RequestInit
) {
  async function api(path: string, init?: RequestInit) {
    const base = getBaseURL();
    const url = path.startsWith('http')
      ? path
      : base
        ? new URL(path, base).toString()
        : path.startsWith('/')
          ? path
          : `/${path}`;
    const extra = getInit?.() ?? {};
    const headers = {
      ...(extra.headers || {}),
      ...(init?.headers || {}),
    } as HeadersInit;
    const credentials = init?.credentials ?? extra.credentials ?? 'same-origin';
    const res = await fetch(url, {
      cache: 'no-store',
      ...extra,
      ...init,
      credentials,
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
    updateReservation: (body: { id: string; groupSlug?: string; reminderMinutes?: number | null }) => {
      if (!body?.id) throw new Error('reservation id is required');
      const { id, ...rest } = body;
      return api(`/api/reservations/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(rest),
      });
    },
    deleteReservation: (body: { id: string; groupSlug?: string }) => {
      if (!body?.id) throw new Error('reservation id is required');
      const { id, ...rest } = body;
      return api(`/api/reservations/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(rest),
      });
    },
    listMyReservations: () => api('/api/me/reservations'),
  };
}
