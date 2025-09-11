// Client-side API helpers built on top of the shared core
import { createApi } from './api-core';

function getBaseURL() {
  return process.env.NEXT_PUBLIC_API_BASE || '';
}

export async function apiGet(path: string, init?: RequestInit) {
  const base = getBaseURL();
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const res = await fetch(url, { cache: 'no-store', ...init });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

export const {
  listGroups,
  createGroup,
  getGroup,
  joinGroup,
  listDevices,
  createDevice,
  listReservations,
  createReservation,
  updateReservation,
  deleteReservation,
  listMyReservations,
} = createApi(getBaseURL);
