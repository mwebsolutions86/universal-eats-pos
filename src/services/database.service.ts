import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

// Définition du chemin de la base de données (UserData/pos_local.db)
const dbPath = path.join(app.getPath('userData'), 'pos_local.db');

export const initLocalDatabase = () => {
    console.log('📂 Initialisation BD à :', dbPath);
    
    // Création/Ouverture de la base
    const db = new Database(dbPath);

    // Pragma pour améliorer les performances SQLite (Mode WAL = Write Ahead Logging)
    db.pragma('journal_mode = WAL');

    // --- MODULE 1 : VENTE & SESSION ---

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

    // 2. Table des Commandes (Miroir Supabase + Colonnes Food Tech)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS local_orders (
            id TEXT PRIMARY KEY,
            order_number INTEGER,
            store_id TEXT NOT NULL,
            pos_session_id TEXT,
            customer_id TEXT,             -- Lien CRM
            customer_name TEXT,
            customer_phone TEXT,          -- Info rapide
            delivery_address TEXT,        -- Pour livraison
            order_type TEXT DEFAULT 'dine_in', -- dine_in, takeaway, delivery, phone
            total_amount REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            payment_status TEXT DEFAULT 'pending', -- pending, paid
            payment_method TEXT,
            channel TEXT DEFAULT 'pos',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending'
        )
    `).run();

    // 🛠️ MIGRATION AUTO : Ajout des colonnes manquantes si la table existait déjà
    // On ajoute un commentaire pour satisfaire ESLint sur les catch vides
    try { db.prepare("ALTER TABLE local_orders ADD COLUMN customer_id TEXT").run(); } catch (e) { /* ignore */ }
    try { db.prepare("ALTER TABLE local_orders ADD COLUMN customer_phone TEXT").run(); } catch (e) { /* ignore */ }
    try { db.prepare("ALTER TABLE local_orders ADD COLUMN delivery_address TEXT").run(); } catch (e) { /* ignore */ }
    try { db.prepare("ALTER TABLE local_orders ADD COLUMN order_type TEXT DEFAULT 'dine_in'").run(); } catch (e) { /* ignore */ }
    try { db.prepare("ALTER TABLE local_orders ADD COLUMN payment_status TEXT DEFAULT 'pending'").run(); } catch (e) { /* ignore */ }

    // 3. Table des Items de commande
    db.prepare(`
        CREATE TABLE IF NOT EXISTS local_order_items (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            product_id TEXT,              -- Peut être null si produit supprimé du catalogue
            product_name TEXT NOT NULL,   -- On garde le nom figé
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            total_price REAL NOT NULL,
            options TEXT,                 -- JSON des variations (ex: {size: 'L', sauce: 'Algérienne'})
            FOREIGN KEY (order_id) REFERENCES local_orders(id) ON DELETE CASCADE
        )
    `).run();

    // --- MODULE 2 : RESSOURCES HUMAINES ---

    // 4. Table Cache du Staff
    db.prepare(`
        CREATE TABLE IF NOT EXISTS local_staff_cache (
            id TEXT PRIMARY KEY,
            full_name TEXT,
            role TEXT,
            pos_pin TEXT,
            avatar_url TEXT,
            last_synced DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    // --- MODULE 3 : CATALOGUE PRODUIT ---

    // 5. Table des Catégories
    db.prepare(`
        CREATE TABLE IF NOT EXISTS local_categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            image_url TEXT,
            display_order INTEGER
        )
    `).run();
    try { db.prepare("ALTER TABLE local_categories ADD COLUMN image_url TEXT").run(); } catch (e) { /* ignore */ }

    // 6. Table des Produits
    db.prepare(`
        CREATE TABLE IF NOT EXISTS local_products (
            id TEXT PRIMARY KEY,
            category_id TEXT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            image_url TEXT,
            is_available INTEGER DEFAULT 1,
            type TEXT DEFAULT 'simple',   -- simple, variable, combo
            sync_status TEXT DEFAULT 'synced'
        )
    `).run();
    try { db.prepare("ALTER TABLE local_products ADD COLUMN type TEXT DEFAULT 'simple'").run(); } catch (e) { /* ignore */ }

    // 7. Variations de Produits
    db.prepare(`
        CREATE TABLE IF NOT EXISTS local_product_variations (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            is_available INTEGER DEFAULT 1,
            sort_order INTEGER,
            FOREIGN KEY (product_id) REFERENCES local_products(id) ON DELETE CASCADE
        )
    `).run();

    // 8. Groupes d'Options
    db.prepare(`
        CREATE TABLE IF NOT EXISTS local_option_groups (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT, -- 'single' ou 'multiple'
            min_selection INTEGER DEFAULT 0,
            max_selection INTEGER DEFAULT 1
        )
    `).run();

    // 9. Items d'Options
    db.prepare(`
        CREATE TABLE IF NOT EXISTS local_option_items (
            id TEXT PRIMARY KEY,
            group_id TEXT NOT NULL,
            name TEXT NOT NULL,
            price REAL DEFAULT 0,
            is_available INTEGER DEFAULT 1,
            FOREIGN KEY (group_id) REFERENCES local_option_groups(id) ON DELETE CASCADE
        )
    `).run();

    // 10. Lien Produit <-> Groupe d'Options
    db.prepare(`
        CREATE TABLE IF NOT EXISTS local_product_option_links (
            product_id TEXT NOT NULL,
            group_id TEXT NOT NULL,
            sort_order INTEGER,
            PRIMARY KEY (product_id, group_id),
            FOREIGN KEY (product_id) REFERENCES local_products(id) ON DELETE CASCADE,
            FOREIGN KEY (group_id) REFERENCES local_option_groups(id) ON DELETE CASCADE
        )
    `).run();

    // --- MODULE 4 : CRM CLIENTS (NOUVEAU) ---

    // 11. Table Clients
    db.prepare(`
        CREATE TABLE IF NOT EXISTS local_customers (
            id TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            loyalty_points INTEGER DEFAULT 0,
            sync_status TEXT DEFAULT 'synced'
        )
    `).run();

    console.log('✅ Base de données SQLite initialisée avec succès (v3 FoodTech).');
    return db;
};