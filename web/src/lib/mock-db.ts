import type { Group, Device, Reservation } from "./types";

export const groups: Group[] = [
  { id:"g1", name:"植物生理学研究室", slug:"plant-phys" },
  { id:"g2", name:"分析化学研究室",   slug:"analytical" }
];

export const devices: Device[] = [
  { id:"d1", device_uid:"JR-PAM-01", name:"ジュニアPAM", category:"fluorometer", location:"Room 302", status:"available", sop_version:3, groupId:"g1" },
  { id:"d2", device_uid:"PCR-02",    name:"PCR (Thermal Cycler)", category:"pcr", location:"Room 305", status:"reserved", sop_version:5, groupId:"g1" },
  { id:"d3", device_uid:"GC-01",     name:"GC-MS", category:"gcms", location:"Room 210", status:"maintenance", sop_version:7, groupId:"g2" },
];

export const reservations: Reservation[] = [
  { id:"r1", deviceId:"d2", groupId:"g1", start:new Date().toISOString(), end:new Date(Date.now()+60*60e3).toISOString(), note:"PCR 予備実験", status:"in_use", bookedByType:"user", bookedById:"u-suzuki" },
  { id:"r2", deviceId:"d1", groupId:"g1", start:new Date(Date.now()+2*60*60e3).toISOString(), end:new Date(Date.now()+3*60*60e3).toISOString(), note:"光合成測定", status:"confirmed", bookedByType:"group", bookedById:"g1" },
];
