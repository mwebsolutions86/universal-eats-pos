// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  db: {
    // --- AUTH & STAFF ---
    checkStaffPin: (pin: string) => ipcRenderer.invoke('db:check-staff-pin', pin),
    getStaffList: () => ipcRenderer.invoke('db:get-staff-list'),
    
    // --- SYNC ---
    syncFullPull: () => ipcRenderer.invoke('db:sync-full-pull'),
    // ✅ Nouvelle méthode exposée
    syncLiveOrders: () => ipcRenderer.invoke('db:sync-live-orders'),
    
    // --- CATALOGUE ---
    getCategories: () => ipcRenderer.invoke('db:get-categories'),
    getProductsByCategory: (categoryId: string) => ipcRenderer.invoke('db:get-products-by-category', categoryId),
    getProductVariations: (productId: string) => ipcRenderer.invoke('db:get-product-variations', productId),

    // --- CRM CLIENTS ---
    searchCustomers: (query: string) => ipcRenderer.invoke('db:search-customers', query),
    createCustomer: (customer: { full_name: string; phone: string; address?: string }) => 
      ipcRenderer.invoke('db:create-customer', customer),
    syncCustomers: () => ipcRenderer.invoke('db:sync-customers'),

    // --- COMMANDES LIVE ---
    getLiveOrders: () => ipcRenderer.invoke('db:get-live-orders'),
    updateOrderStatus: (orderId: string, status: string) => ipcRenderer.invoke('db:update-order-status', orderId, status),

    // --- TRANSACTIONNEL ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createOrder: (orderData: any) => ipcRenderer.invoke('db:create-order', orderData),
  },
  
  // --- SYSTÈME ---
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onNetworkStatusChange: (callback: (status: boolean) => void) => {
    // Placeholder pour la gestion online/offline future
    callback(true);
  }
});