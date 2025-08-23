export type Group = {
  id: string;
  name: string;
  slug: string;
  passwordHash?: string;
  memberIds: string[];
};

export type Device = {
  id: string;
  groupId: string;
  name: string;
  note?: string;
};

export type Reservation = {
  id: string;
  groupId: string;
  deviceId: string;
  start: string; // ISO
  end: string;   // ISO
  purpose?: string;
  reserver: string; // reserver name
};
