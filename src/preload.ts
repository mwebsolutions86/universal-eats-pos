import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  db: {
    checkStaffPin: (pin: string) => ipcRenderer.invoke('db:check-staff-pin', pin),
    getStaffList: () => ipcRenderer.invoke('db:get-staff-list'),
    syncStaff: (staffData: any) => ipcRenderer.invoke('db:sync-staff', staffData),
    syncFullPull: () => ipcRenderer.invoke('db:sync-full-pull'),
    
    // NOUVEAU : Catalogue
    getCategories: () => ipcRenderer.invoke('db:get-categories'),
    getProductsByCategory: (categoryId: string) => ipcRenderer.invoke('db:get-products-by-category', categoryId),
    getProductVariations: (productId: string) => ipcRenderer.invoke('db:get-product-variations', productId),
  },
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  onNetworkStatusChange: (callback: (status: boolean) => void) => 
    ipcRenderer.on('network-status', (_event, status) => callback(status)),
});