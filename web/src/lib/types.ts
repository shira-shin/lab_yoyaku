export type Device = {
  id: string;
  slug: string;
  name: string;
  note?: string;
  qrToken: string;
};

export type Reservation = {
  id: string;
  deviceId: string;
  start: string; // ISO
  end: string;   // ISO
  title?: string;
  reserver: string; // reserver name
  user?: string;
  participants?: string[];
  scope: 'group' | 'member';
  memberId?: string;
  reminderMinutes?: number;
};

export type Group = {
  id: string;
  slug: string;
  name: string;
  passwordHash?: string;
  members: Array<{ id: string; name: string; role: 'admin' | 'member' }>;
  devices: Device[];
  reservations: Reservation[];
};
