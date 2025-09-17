// Client-side API helpers built on top of the shared core
import { createApi } from './api-core';

function getBaseURL() {
  if (typeof window !== 'undefined') return '';
  if (process.env.NEXT_PUBLIC_API_BASE) return process.env.NEXT_PUBLIC_API_BASE;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return '';
}

function resolveUrl(path: string) {
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) return path;
  const base = getBaseURL();
  return base ? `${base}${path.startsWith('/') ? path : `/${path}`}` : `/${path}`;
}

export async function apiGet(path: string, init?: RequestInit) {
  const url = resolveUrl(path);
  const res = await fetch(url, {
    cache: 'no-store',
    credentials: 'same-origin',
    ...init,
  });
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
