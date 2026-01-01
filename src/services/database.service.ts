// eslint-disable-next-line import/no-named-as-default
import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import crypto from 'crypto';

const dbPath = path.join(app.getPath('userData'), 'pos_local.db');

export const initLocalDatabase = () => {
    console.log('📂 Initialisation BD à :', dbPath);
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    // --- MODULE 0 : CONFIGURATION LOCAL ---
    db.prepare(`
        CREATE TABLE IF NOT EXISTS local_config (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `).run();

    // --- MODULE 1 : VENTE & SESSION ---
    db.prepare(`
        CREATE TABLE IF NOT EXISTS local_pos_sessions (
            id TEXT PRIMARY KEY,
            store_id TEXT NOT NULL,
            opened_by TEXT NOT NULL,
            opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            closed_at DATETIME,
            opening_balance REAL DEFAULT 0,
            closing_balance REAL,
            actual_closing_balance REAL,
            notes TEXT,
            status TEXT DEFAULT 'open',
            sync_status TEXT DEFAULT 'pending'
        )
    `).run();
    try { db.prepare("ALTER TABLE local_pos_sessions ADD COLUMN closing_balance REAL").run(); } catch (e) { /* ignore */ }
    try { db.prepare("ALTER TABLE local_pos_sessions ADD COLUMN notes TEXT").run(); } catch (e) { /* ignore */ }

    db.prepare(`
        CREATE TABLE IF NOT EXISTS local_orders (
            id TEXT PRIMARY KEY,
            order_number INTEGER,
            store_id TEXT NOT NULL,
            pos_session_id TEXT,
            customer_id TEXT,
            customer_name TEXT,
            customer_phone TEXT,
            delivery_address TEXT,
            order_type TEXT DEFAULT 'dine_in',
            total_amount REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            payment_status TEXT DEFAULT 'pending',
            payment_method TEXT,
            amount_received REAL,
            amount_returned REAL,
            channel TEXT DEFAULT 'pos',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending'
        )
    `).run();

    // Migrations
    try { db.prepare("ALTER TABLE local_orders ADD COLUMN customer_id TEXT").run(); } catch (e) { /* ignore */ }
    try { db.prepare("ALTER TABLE local_orders ADD COLUMN customer_phone TEXT").run(); } catch (e) { /* ignore */ }
    try { db.prepare("ALTER TABLE local_orders ADD COLUMN delivery_address TEXT").run(); } catch (e) { /* ignore */ }
    try { db.prepare("ALTER TABLE local_orders ADD COLUMN order_type TEXT DEFAULT 'dine_in'").run(); } catch (e) { /* ignore */ }
    try { db.prepare("ALTER TABLE local_orders ADD COLUMN payment_status TEXT DEFAULT 'pending'").run(); } catch (e) { /* ignore */ }
    try { db.prepare("ALTER TABLE local_orders ADD COLUMN amount_received REAL").run(); } catch (e) { /* ignore */ }
    try { db.prepare("ALTER TABLE local_orders ADD COLUMN amount_returned REAL").run(); } catch (e) { /* ignore */ }
    
    db.prepare(`
        CREATE TABLE IF NOT EXISTS local_order_items (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            product_id TEXT,
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            total_price REAL NOT NULL,
            options TEXT,
            FOREIGN KEY (order_id) REFERENCES local_orders(id) ON DELETE CASCADE
        )
    `).run();

    // --- MODULE 2 : RESSOURCES HUMAINES ---
    db.prepare(`
        CREATE TABLE IF NOT EXISTS local_staff_cache (
            id TEXT PRIMARY KEY,
            store_id TEXT,
            full_name TEXT,
            role TEXT,
            pos_pin TEXT,
            avatar_url TEXT,
            last_synced DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();
    try { db.prepare("ALTER TABLE local_staff_cache ADD COLUMN store_id TEXT").run(); } catch (e) { /* ignore */ }

    // --- MODULE 3 : CATALOGUE PRODUIT ---
    db.prepare(`CREATE TABLE IF NOT EXISTS local_categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, image_url TEXT, display_order INTEGER)`).run();
    try { db.prepare("ALTER TABLE local_categories ADD COLUMN image_url TEXT").run(); } catch (e) { /* ignore */ }

    db.prepare(`CREATE TABLE IF NOT EXISTS local_products (id TEXT PRIMARY KEY, category_id TEXT, name TEXT NOT NULL, description TEXT, price REAL NOT NULL, image_url TEXT, is_available INTEGER DEFAULT 1, type TEXT DEFAULT 'simple', sync_status TEXT DEFAULT 'synced')`).run();
    try { db.prepare("ALTER TABLE local_products ADD COLUMN type TEXT DEFAULT 'simple'").run(); } catch (e) { /* ignore */ }

    db.prepare(`CREATE TABLE IF NOT EXISTS local_product_variations (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, name TEXT NOT NULL, price REAL NOT NULL, is_available INTEGER DEFAULT 1, sort_order INTEGER, FOREIGN KEY (product_id) REFERENCES local_products(id) ON DELETE CASCADE)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS local_option_groups (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT, min_selection INTEGER DEFAULT 0, max_selection INTEGER DEFAULT 1)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS local_option_items (id TEXT PRIMARY KEY, group_id TEXT NOT NULL, name TEXT NOT NULL, price REAL DEFAULT 0, is_available INTEGER DEFAULT 1, FOREIGN KEY (group_id) REFERENCES local_option_groups(id) ON DELETE CASCADE)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS local_product_option_links (product_id TEXT NOT NULL, group_id TEXT NOT NULL, sort_order INTEGER, PRIMARY KEY (product_id, group_id))`).run();

    // --- MODULE 4 : CRM CLIENTS ---
    db.prepare(`CREATE TABLE IF NOT EXISTS local_customers (id TEXT PRIMARY KEY, full_name TEXT NOT NULL, phone TEXT, address TEXT, loyalty_points INTEGER DEFAULT 0, sync_status TEXT DEFAULT 'synced')`).run();

    // --- MODULE 5 : TRANSACTIONNEL ---
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any).createOrder = (orderData: any) => {
        const { items, total, paymentMethod, amountReceived, storeId, sessionId, customerId, orderType } = orderData;
        
        const orderId = crypto.randomUUID();
        const orderNumber = Date.now(); 

        const insertOrder = db.prepare(`
            INSERT INTO local_orders (
                id, order_number, store_id, pos_session_id, customer_id, 
                order_type, total_amount, status, payment_status, 
                payment_method, amount_received, amount_returned,
                created_at, sync_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', 'paid', ?, ?, ?, CURRENT_TIMESTAMP, 'pending')
        `);

        const insertItem = db.prepare(`
            INSERT INTO local_order_items (
                id, order_id, product_id, product_name, 
                quantity, unit_price, total_price, options
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const createTransaction = db.transaction(() => {
            insertOrder.run(
                orderId,
                orderNumber,
                storeId,
                sessionId,
                customerId || null,
                orderType,
                total,
                paymentMethod,
                amountReceived || total, 
                (amountReceived || total) - total 
            );

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const item of items) {
                const itemTotal = (item.variation ? item.variation.price : item.product.price) * item.qty;
                const unitPrice = item.variation ? item.variation.price : item.product.price;
                
                insertItem.run(
                    crypto.randomUUID(),
                    orderId,
                    item.product.id,
                    item.product.name + (item.variation ? ` (${item.variation.name})` : ''),
                    item.qty,
                    unitPrice,
                    itemTotal,
                    JSON.stringify(item.variation ? { variation: item.variation } : {})
                );
            }
        });

        try {
            createTransaction();
            console.log("✅ Commande créée avec succès :", orderId);
            return { success: true, orderId };
        } catch (error: unknown) {
            console.error("❌ Erreur création commande :", error);
            const msg = error instanceof Error ? error.message : String(error);
            return { success: false, error: msg };
        }
    };

    // --- MODULE 6 : LECTURE LIVE ORDERS ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any).getLiveOrders = () => {
        const orders = db.prepare(`
            SELECT * FROM local_orders 
            WHERE status NOT IN ('cancelled', 'delivered') 
            ORDER BY created_at DESC LIMIT 50
        `).all();

        const getItems = db.prepare('SELECT * FROM local_order_items WHERE order_id = ?');

        // Correction du type any pour le map
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return orders.map((order: any) => {
            const items = getItems.all(order.id);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const parsedItems = items.map((item: any) => ({
                ...item,
                options: item.options ? JSON.parse(item.options) : {}
            }));
            return { ...order, items: parsedItems };
        });
    };

    console.log('✅ Base de données SQLite V5.2 (Live Orders Hydration) initialisée.');
    return db;
};