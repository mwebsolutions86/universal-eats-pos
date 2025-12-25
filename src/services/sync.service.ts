import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from 'better-sqlite3';

export class SyncService {
  private supabase: SupabaseClient;
  private db: Database;

  constructor(db: Database) {
    this.db = db;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // Validation explicite au lieu de l'assertion "!"
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Missing Supabase environment variables. Please check your .env file."
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async syncAll(): Promise<void> {
    console.log('Début de la synchronisation complète...');
    await this.syncCategories();
    await this.syncProducts();
    console.log('Synchronisation terminée.');
  }

  

  private async syncCategories(): Promise<void> {
    const { data, error } = await this.supabase.from('categories').select('*');
    if (error) throw error;
    if (!data) return;

    const upsert = this.db.prepare(`
      INSERT OR REPLACE INTO local_categories (id, name, display_order)
      VALUES (?, ?, ?)
    `);

    const transaction = this.db.transaction((items: any[]) => {
      for (const item of items) {
        upsert.run(item.id, item.name, item.display_order);
      }
    });

    transaction(data);
  }

  private async syncStaff() {
  const { data, error } = await this.supabase
    .from('profiles')
    .select('id, full_name, role, pos_pin, avatar_url'); // On récupère le PIN ici !

  if (error) throw error;

  const upsert = this.db.prepare(`
    INSERT OR REPLACE INTO local_staff_cache (id, full_name, role, pos_pin, avatar_url)
    VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = this.db.transaction((items: any[]) => {
    for (const item of items) {
      upsert.run(
        item.id,
        item.full_name,
        item.role,
        item.pos_pin,
        item.avatar_url
      );
    }
  });

  transaction(data);
}

  private async syncProducts(): Promise<void> {
    const { data, error } = await this.supabase.from('products').select('*');
    if (error) throw error;
    if (!data) return;

    const upsert = this.db.prepare(`
      INSERT OR REPLACE INTO local_products (id, category_id, name, description, price, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((items: any[]) => {
      for (const item of items) {
        upsert.run(
          item.id, 
          item.category_id, 
          item.name, 
          item.description, 
          item.price, 
          item.image_url
        );
      }
    });

    transaction(data);
  }
}