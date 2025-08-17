export const getDevices = async () =>
  await (await fetch('/api/devices', { cache: 'no-store' })).json();

export const getDevice = async (uid: string) => {
  const { devices } = await getDevices();
  return devices.find((d: any) => d.device_uid === uid);
};

export const getReservations = async (uid: string) =>
  await (await fetch(`/api/mock/reservations?uid=${uid}`, { cache: 'no-store' })).json();

export const createReservation = async (p: any) => {
  const r = await fetch('/api/mock/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });
  if (!r.ok) throw await r.json();
  return r.json();
};
