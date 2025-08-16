export type DeviceState = 'available' | 'reserved' | 'in_use' | 'maintenance' | 'out_of_service';
export type Device = {
  id: string;
  device_uid: string;
  name: string;
  category?: string;
  location?: string;
  status: DeviceState;
  sop_version: number;
};

export const MOCK_DEVICES: Device[] = [
  { id: 'd1', device_uid: 'JR-PAM-01', name: 'ジュニアPAM', category: 'fluorometer', location: 'Room 302', status: 'available', sop_version: 3 },
  { id: 'd2', device_uid: 'PCR-02', name: 'PCR (Thermal Cycler)', category: 'pcr', location: 'Room 305', status: 'reserved', sop_version: 5 },
  { id: 'd3', device_uid: 'GC-01', name: 'GC-MS', category: 'gcms', location: 'Room 210', status: 'maintenance', sop_version: 7 },
];
