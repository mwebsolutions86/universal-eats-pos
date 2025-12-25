import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

// Définition du chemin de la base de données
// On utilise app.getPath('userData') pour être compatible Windows 7 à 11
const dbPath = path.join(app.getPath('userData'), 'pos_local.db');

export const initLocalDatabase = () => {
    // Création/Ouverture de la base
    const db = new Database(dbPath);

    // Pragma pour améliorer les performances SQLite
    db.pragma('journal_mode = WAL');

    // 1. Table des Sessions de Caisse
    db.prepare(`
        CREATE TABLE IF NOT EXISTS local_pos_sessions (
            id TEXT PRIMARY KEY,
            store_id TEXT NOT NULL,
            opened_by TEXT NOT NULL,
            opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            closed_at DATETIME,
            opening_balance REAL DEFAULT 0,
            status TEXT DEFAULT 'open',
            sync_status TEXT DEFAULT 'pending'
        )
    `).run();

    // 2. Table des Commandes (Miroir Supabase)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS local_orders (
            id TEXT PRIMARY KEY,
            order_number INTEGER,
            store_id TEXT NOT NULL,
            pos_session_id TEXT,
            customer_name TEXT,
            total_amount REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            payment_method TEXT,
            channel TEXT DEFAULT 'pos',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending'
        )
    `).run();

    // 3. Table des Items
    db.prepare(`
        CREATE TABLE IF NOT EXISTS local_order_items (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            total_price REAL NOT NULL,
            options TEXT, 
            FOREIGN KEY (order_id) REFERENCES local_orders(id) ON DELETE CASCADE
        )
    `).run();

    // 4. Table Cache du Staff (Profiles)
db.prepare(`
    CREATE TABLE IF NOT EXISTS local_staff_cache (
        id TEXT PRIMARY KEY,          -- UUID de Supabase
        full_name TEXT,
        role TEXT,                   -- 'admin', 'staff'
        pos_pin TEXT,                -- Code PIN hashé ou clair (selon votre choix de sécurité)
        avatar_url TEXT,
        last_synced DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

// 5. Table des Produits (Cache local)
db.prepare(`
    CREATE TABLE IF NOT EXISTS local_products (
        id TEXT PRIMARY KEY,
        category_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        image_url TEXT,
        is_available INTEGER DEFAULT 1,
        sync_status TEXT DEFAULT 'synced'
    )
`).run();

// 6. Table des Catégories
db.prepare(`
    CREATE TABLE IF NOT EXISTS local_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        display_order INTEGER
    )
`).run();

    console.log('✅ Base de données SQLite prête :', dbPath);
    return db;
};

