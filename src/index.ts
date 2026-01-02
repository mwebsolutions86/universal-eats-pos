import { app, BrowserWindow, ipcMain, session } from 'electron';
import { config } from 'dotenv';
config();

import { v4 as uuidv4 } from 'uuid';
import { initLocalDatabase } from './services/database.service';
import { SyncService } from './services/sync.service';

// Variables Webpack
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

console.log('🚀 Démarrage de l\'application Electron...');

if (require('electron-squirrel-startup')) {
  console.log('🐿️ Squirrel startup détecté, arrêt.');
  app.quit();
}

console.log('📊 Initialisation de la base de données...');
const db = initLocalDatabase();
console.log('✅ Base de données initialisée.');

console.log('🔄 Initialisation du service de synchronisation...');
let syncService: SyncService;
try {
  syncService = new SyncService(db);
  console.log('✅ Service de synchronisation initialisé.');
} catch (error: unknown) {
  console.error('❌ Erreur lors de l\'initialisation du service de synchronisation:', error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('Détails:', errorMessage);
  // Ne pas quitter, continuer sans sync
  syncService = null as any;
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#f3f4f6',
    show: false,
    webPreferences: {
      sandbox: false,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Désactivé pour les images locales/externes
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
};

app.on('ready', () => {
  // --- CSP FIX ---
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src * 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'self' 'unsafe-inline' 'unsafe-eval'; connect-src * 'self' 'unsafe-inline'; img-src * self data: blob: https:; style-src * 'self' 'unsafe-inline';"
        ]
      }
    })
  });

  // --- HANDLERS BASE DE DONNEES ---

  // Auth
  ipcMain.handle('db:check-staff-pin', async (_event, pin) => {
    return db.prepare('SELECT * FROM local_staff_cache WHERE pos_pin = ?').get(pin);
  });

  ipcMain.handle('db:get-staff-list', async () => {
    return db.prepare('SELECT * FROM local_staff_cache').all();
  });

  // Sync Global
  ipcMain.handle('db:sync-full-pull', async () => {
    try {
      return await syncService.syncAll();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  // ✅ AJOUT : Sync Orders Only (Polling)
  ipcMain.handle('db:sync-live-orders', async () => {
    try {
      return await syncService.syncLiveOrders();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  });

  // Catalogue
  ipcMain.handle('db:get-categories', async () => {
    return db.prepare('SELECT * FROM local_categories ORDER BY display_order ASC').all();
  });

  ipcMain.handle('db:get-products-by-category', async (_event, categoryId) => {
    return db.prepare('SELECT * FROM local_products WHERE category_id = ? AND is_available = 1').all(categoryId);
  });
  
  ipcMain.handle('db:get-product-variations', async (_event, productId) => {
    return db.prepare('SELECT * FROM local_product_variations WHERE product_id = ? ORDER BY sort_order ASC').all(productId);
  });

  // CRM
  ipcMain.handle('db:search-customers', async (_event, query) => {
    const sql = `SELECT * FROM local_customers WHERE full_name LIKE ? OR phone LIKE ? LIMIT 10`;
    const wildcard = `%${query}%`;
    return db.prepare(sql).all(wildcard, wildcard);
  });

  ipcMain.handle('db:create-customer', async (_event, customerData) => {
    const newId = uuidv4();
    const stmt = db.prepare(`INSERT INTO local_customers (id, full_name, phone, address, loyalty_points, sync_status) VALUES (?, ?, ?, ?, 0, 'new_local')`);
    stmt.run(newId, customerData.full_name, customerData.phone, customerData.address || null);
    return { id: newId, ...customerData, loyalty_points: 0 };
  });
  
  ipcMain.handle('db:sync-customers', async () => { return true; });

  // Live Orders
  ipcMain.handle('db:get-live-orders', async () => {
    return db.prepare(`SELECT * FROM local_orders WHERE status NOT IN ('cancelled', 'delivered') ORDER BY created_at DESC LIMIT 50`).all();
  });
  
  ipcMain.handle('db:update-order-status', async (_event, orderId, status) => {
    db.prepare('UPDATE local_orders SET status = ? WHERE id = ?').run(status, orderId);
  });

  // Transactionnel (POS)
  ipcMain.handle('db:create-order', async (_event, orderData) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (db as any).createOrder(orderData);
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});