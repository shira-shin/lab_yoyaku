const BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  "http://localhost:3000";
const abs = (p: string) => new URL(p, BASE).toString();

export const listDevices = async (groupId?: string) => {
  const params = groupId ? `?groupId=${encodeURIComponent(groupId)}` : "";
  const res = await fetch(abs(`/api/mock/devices${params}`), { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};
export const getDevices = listDevices;

export const getGroups = async () => {
  const res = await fetch(abs("/api/mock/groups"), { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};
export const getGroup = async (slug: string) => {
  const res = await fetch(
    abs(`/api/mock/groups/${encodeURIComponent(slug)}`),
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};
export const listReservations = async (q: {
  groupId?: string;
  deviceId?: string;
  from?: string;
  to?: string;
}) => {
  const params = new URLSearchParams(q as any).toString();
  const res = await fetch(abs(`/api/mock/reservations?${params}`), {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};
export const getReservations = listReservations;

export const createReservation = async (payload: any) => {
  const r = await fetch(abs("/api/mock/reservations"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

export const getDevice = async (uid: string) => {
  const { devices } = await listDevices();
  return devices.find((d: any) => d.device_uid === uid);
};

export const createGroup = async (payload: {
  name: string;
  slug: string;
  password: string;
}) => {
  const r = await fetch(abs('/api/mock/groups'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

export const joinGroup = async (payload: { group: string; password: string }) => {
  const r = await fetch(abs('/api/mock/groups/join'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

export const createDevice = async (payload: any) => {
  const r = await fetch(abs('/api/mock/devices'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

export const getNegotiations = async (deviceId: string) => {
  const params = new URLSearchParams({ deviceId }).toString();
  const res = await fetch(abs(`/api/mock/negotiations?${params}`), {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const createNegotiation = async (payload: any) => {
  const r = await fetch(abs('/api/mock/negotiations'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

export const updateNegotiation = async (id: string, status: string) => {
  const r = await fetch(abs(`/api/mock/negotiations/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
