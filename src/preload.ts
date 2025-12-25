import { contextBridge, ipcRenderer } from 'electron';
import type { StaffMember } from './types';

contextBridge.exposeInMainWorld('electronAPI', {
  db: {
    checkStaffPin: (pin: string) => ipcRenderer.invoke('db:check-staff-pin', pin),
    getStaffList: () => ipcRenderer.invoke('db:get-staff-list'),
    syncFullPull: () => ipcRenderer.invoke('sync:full-pull'),
    // On spécifie le type ici aussi au lieu de any
    syncStaff: (staffData: StaffMember[]) => ipcRenderer.invoke('db:sync-staff', staffData),
  },
  
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onNetworkStatusChange: (callback: (status: boolean) => void) => {
    ipcRenderer.on('network-status', (_event, status) => callback(status));
  }
});