export type Group = {
  id: string;
  name: string;
  slug: string; // ASCII only
  passwordHash?: string;
  createdAt: string;
};

export type Member = {
  id: string;
  groupId: string;
  displayName: string;
  email?: string;
  role: 'owner' | 'admin' | 'member';
};

export type Device = {
  id: string;
  groupId: string;
  name: string;
  category?: string;
  location?: string;
  uid: string; // for QR code
  status: 'available' | 'booked' | 'maintenance';
  sopVersion?: string;
};

export type Reservation = {
  id: string;
  groupId: string;
  deviceId: string;
  title: string;
  start: string; // ISO
  end: string;   // ISO
  reservedBy: string; // memberId
  scope: 'group' | 'individual';
  notes?: string;
};
