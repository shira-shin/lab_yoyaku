import type { Group, Member, Device, Reservation } from './types';

const base = process.env.NEXT_PUBLIC_USE_MOCK === 'true'
  ? '/api/mock'
  : (process.env.NEXT_PUBLIC_API_URL as string);

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${base}${path}`, { cache: 'no-store', ...init });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const json = await r.json();
  if (json?.ok === false) throw new Error(json.error || 'API error');
  return (json?.data ?? json) as T;
}

// Groups
export const listGroups = () => api<Group[]>('/groups');
export const getGroup = (slug: string) =>
  api<
    Group & {
      members: Member[];
      devices: Device[];
      counts: { members: number; devices: number };
    }
  >(`/groups/${slug}`);
export const createGroup = (p: { name: string; slug: string; password: string }) =>
  api<Group>('/groups', { method: 'POST', body: JSON.stringify(p) });
export const joinGroup = (p: { identifier: string; password: string }) =>
  api<{ group: Group; member: Member }>('/groups/join', {
    method: 'POST',
    body: JSON.stringify(p),
  });

// Devices
export const listDevices = (groupId: string) =>
  api<Device[]>(`/devices?groupId=${groupId}`);
export const createDevice = (
  p: Omit<Device, 'id' | 'status'> & { status?: Device['status'] }
) => api<Device>('/devices', { method: 'POST', body: JSON.stringify(p) });

// Reservations
export const listReservations = (q: {
  groupId: string;
  deviceId?: string;
  from: string;
  to: string;
}) => api<Reservation[]>(`/reservations?${new URLSearchParams(q as any)}`);
export const createReservation = (p: Omit<Reservation, 'id'>) =>
  api<Reservation>('/reservations', { method: 'POST', body: JSON.stringify(p) });

