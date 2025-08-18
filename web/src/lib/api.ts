import type { Group, Member, Device, Reservation } from './types';

const useMock = (process.env.NEXT_PUBLIC_USE_MOCK ?? 'true').toLowerCase() === 'true';
const API_BASE = useMock
  ? '/api/mock'
  : (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const base = API_BASE || '/api/mock';
  const url = `${base}${path}`;
  const res = await fetch(url, {
    cache: 'no-store',
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers as any) },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${url} :: ${msg}`);
  }
  const json = await res.json().catch(() => ({}));
  return ((json as any)?.data ?? json) as T;
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

