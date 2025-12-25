import { app, BrowserWindow, ipcMain } from 'electron';
import { initLocalDatabase } from './services/database.service';
import { SyncService } from './services/sync.service';

// Ceci permet le hot reload en développement
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require('electron-squirrel-startup')) {
  app.quit();
}

// Initialisation Base de données
const db = initLocalDatabase();
const syncService = new SyncService(db);

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  // mainWindow.webContents.openDevTools(); // Décommentez pour debug
};

app.on('ready', () => {
  createWindow();

  // --- HANDLERS IPC (DATABASE) ---

  // 1. Auth & Staff
  ipcMain.handle('db:check-staff-pin', (_, pin) => {
    return db.prepare('SELECT * FROM local_staff_cache WHERE pos_pin = ?').get(pin);
  });

  ipcMain.handle('db:get-staff-list', () => {
    return db.prepare('SELECT * FROM local_staff_cache').all();
  });

  // 2. Synchronisation
  ipcMain.handle('db:sync-full-pull', async () => {
    return await syncService.syncAll();
  });

  // 3. Catalogue (NOUVEAU)
  ipcMain.handle('db:get-categories', () => {
    return db.prepare('SELECT * FROM local_categories ORDER BY display_order ASC').all();
  });

  ipcMain.handle('db:get-products-by-category', (_, categoryId) => {
    // On récupère les produits actifs d'une catégorie
    return db.prepare(`
      SELECT * FROM local_products 
      WHERE category_id = ? AND is_available = 1
    `).all(categoryId);
  });
  
  ipcMain.handle('db:get-product-variations', (_, productId) => {
    return db.prepare(`
      SELECT * FROM local_product_variations 
      WHERE product_id = ? AND is_available = 1 
      ORDER BY sort_order ASC
    `).all(productId);
  });

  // Handler Version
  ipcMain.handle('app:get-version', () => app.getVersion());
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});