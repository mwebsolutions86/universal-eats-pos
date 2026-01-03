/* eslint-disable @typescript-eslint/no-explicit-any */
import { app, BrowserWindow, ipcMain, session } from 'electron';
import { config } from 'dotenv';
config();

import { v4 as uuidv4 } from 'uuid';
import { initLocalDatabase } from './services/database.service';
import { SyncService } from './services/sync.service';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require('electron-squirrel-startup')) {
  app.quit();
}

const db = initLocalDatabase();

// ✅ CRÉATION DES TABLES D'INGRÉDIENTS
db.exec(`
  CREATE TABLE IF NOT EXISTS local_ingredients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_available INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS local_product_ingredients (
    product_id TEXT,
    ingredient_id TEXT,
    PRIMARY KEY (product_id, ingredient_id)
  );
`);

let syncService: SyncService;
try {
  syncService = new SyncService(db);
} catch (error: unknown) {
  console.error('❌ Erreur Synchro:', error);
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
      webSecurity: false 
    },
  });
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.once('ready-to-show', () => { mainWindow.show(); });
};

app.on('ready', () => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [ "default-src * 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'self' 'unsafe-inline' 'unsafe-eval'; connect-src * 'self' 'unsafe-inline'; img-src * self data: blob: https:; style-src * 'self' 'unsafe-inline';" ]
      }
    })
  });

  // HANDLERS
  ipcMain.handle('db:check-staff-pin', async (_event, pin) => { return db.prepare('SELECT * FROM local_staff_cache WHERE pos_pin = ?').get(pin); });
  ipcMain.handle('db:get-staff-list', async () => { return db.prepare('SELECT * FROM local_staff_cache').all(); });
  ipcMain.handle('db:sync-full-pull', async () => { try { return await syncService.syncAll(); } catch (error: unknown) { return { success: false, error: String(error) }; } });
  ipcMain.handle('db:sync-live-orders', async () => { try { return await syncService.syncLiveOrders(); } catch (error: unknown) { return { success: false, error: String(error) }; } });

  // CATALOGUE
  ipcMain.handle('db:get-categories', async () => { return db.prepare('SELECT * FROM local_categories ORDER BY display_order ASC').all(); });
  ipcMain.handle('db:get-products-by-category', async (_event, categoryId) => { return db.prepare('SELECT * FROM local_products WHERE category_id = ? AND is_available = 1').all(categoryId); });
  ipcMain.handle('db:get-product-variations', async (_event, productId) => { return db.prepare('SELECT * FROM local_product_variations WHERE product_id = ? ORDER BY sort_order ASC').all(productId); });
  
  // ✅ GET INGREDIENTS
  ipcMain.handle('db:get-product-ingredients', async (_event, productId) => {
    try {
        return db.prepare(`SELECT i.* FROM local_ingredients i JOIN local_product_ingredients pi ON pi.ingredient_id = i.id WHERE pi.product_id = ? ORDER BY i.name ASC`).all(productId);
    } catch (e) { return []; }
  });

  ipcMain.handle('db:get-product-options', async (_event, productId) => {
    try {
      const groups = db.prepare(`SELECT g.* FROM local_option_groups g JOIN local_product_option_links l ON l.group_id = g.id WHERE l.product_id = ? ORDER BY l.sort_order ASC`).all(productId);
      const groupsWithItems = groups.map((group: any) => {
        const items = db.prepare(`SELECT * FROM local_option_items WHERE group_id = ? AND is_available = 1`).all(group.id);
        return { ...group, items };
      });
      return groupsWithItems;
    } catch (e) { return []; }
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

  // LIVE ORDERS - LECTURE CORRIGÉE
  ipcMain.handle('db:get-live-orders', async () => {
    try {
        const orders = db.prepare(`SELECT * FROM local_orders WHERE status NOT IN ('cancelled', 'delivered') ORDER BY created_at DESC LIMIT 50`).all();
        const ordersWithItems = orders.map((order: any) => {
            const items = db.prepare('SELECT * FROM local_order_items WHERE order_id = ?').all(order.id);
            const parsedItems = items.map((item: any) => {
                let parsedOptions = null;
                try {
                    if (item.options && typeof item.options === 'string') {
                        parsedOptions = JSON.parse(item.options);
                    } else {
                        parsedOptions = item.options;
                    }
                } catch (e) { parsedOptions = null; }
                return { ...item, options: parsedOptions };
            });
            return { ...order, items: parsedItems };
        });
        return ordersWithItems;
    } catch (e) { console.error("Erreur lecture commandes:", e); return []; }
  });
  
  // STATUT & PAIEMENT
  ipcMain.handle('db:update-order-status', async (_event, orderId, status) => {
    console.log(`🔄 Update Statut: ${orderId} -> ${status}`);
    db.prepare('UPDATE local_orders SET status = ? WHERE id = ?').run(status, orderId);
    if (syncService) await syncService.pushOrderStatus(orderId, status);
  });
  ipcMain.handle('db:pay-order', async (_event, orderId, method, amount) => {
    console.log(`💰 Encaissement Commande ${orderId} via ${method}`);
    try {
      const stmt = db.prepare(`UPDATE local_orders SET payment_status = 'paid', payment_method = ?, amount_received = ?, status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END WHERE id = ?`);
      stmt.run(method, amount, orderId);
      if (syncService) await syncService.pushPayment(orderId, method, amount);
      return true;
    } catch (e) { console.error("Erreur encaissement:", e); return false; }
  });

  // ✅ CRÉATION AVEC EXCLUSIONS
  ipcMain.handle('db:create-order', async (_event, orderData) => {
    console.log("📝 Création commande avec détails...");
    const { items, total, paymentMethod, amountReceived, storeId, customerId, orderType } = orderData;
    const orderId = uuidv4();
    const orderNumber = Math.floor(1000 + Math.random() * 9000); 

    try {
        const insertOrder = db.prepare(`INSERT INTO local_orders (id, order_number, store_id, customer_id, customer_name, order_type, total_amount, status, payment_status, payment_method, amount_received, created_at, sync_status, channel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'new_local', 'pos')`);
        const status = paymentMethod ? 'confirmed' : 'pending';
        const payStatus = paymentMethod ? 'paid' : 'pending';
        insertOrder.run(orderId, orderNumber, storeId, customerId, 'Client Comptoir', orderType, total, status, payStatus, paymentMethod, amountReceived);

        const insertItem = db.prepare(`INSERT INTO local_order_items (id, order_id, product_id, product_name, quantity, unit_price, total_price, options) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

        for (const item of items) {
            const itemTotal = (item.variation ? item.variation.price : item.product.price) + (item.options || []).reduce((acc: number, o: any) => acc + (o.price || 0), 0);
            
            // ✅ JSON RICHE
            const optionsPayload = {
                variation: item.variation ? { name: item.variation.name, price: item.variation.price } : null,
                options: item.options ? item.options.map((o: any) => ({ name: o.name, price: o.price })) : [],
                note: item.note || '',
                removed_ingredients: item.removedIngredients || [] 
            };

            insertItem.run(uuidv4(), orderId, item.product.id, item.product.name, item.qty, itemTotal, itemTotal * item.qty, JSON.stringify(optionsPayload));
        }
        return { success: true, orderId };
    } catch (e: any) { console.error("Erreur création:", e); return { success: false, error: e.message }; }
  });

  createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });