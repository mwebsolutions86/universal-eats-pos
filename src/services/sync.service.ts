import { createClient } from '@supabase/supabase-js';
import { Database } from 'better-sqlite3'; 
import { 
  StaffMember, 
  Category, 
  OptionGroup, 
  OptionItem, 
  Product, 
  ProductVariation, 
  ProductOptionLink,
  Customer 
} from '../types';

export class SyncService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabase: any;
  private db: Database;

  constructor(db: Database) {
    this.db = db;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables. Please check your .env file.");
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async syncAll(): Promise<{ success: boolean; error?: string }> {
    console.log('🔄 DÉBUT: Synchronisation complète...');
    const start = performance.now();

    try {
      await this.syncStaff();
      await this.syncCustomers();
      await this.syncCategories();
      await this.syncOptionGroups();
      await this.syncOptionItems();
      await this.syncProducts();
      await this.syncProductVariations();
      await this.syncProductOptionLinks();

      const duration = ((performance.now() - start) / 1000).toFixed(2);
      console.log(`✅ SUCCÈS: Synchronisation terminée en ${duration}s.`);
      return { success: true };

    } catch (error: unknown) { // CORRECTION: 'any' -> 'unknown'
      console.log("🔥 ERREUR BRUTE (DEBUG):", error);

      // JSON.stringify fonctionne très bien sur 'unknown'
      const errorMessage = JSON.stringify(error, null, 2);
      
      console.error('❌ ERREUR CRITIQUE DE SYNC (Détails):');
      console.error(errorMessage);
      
      return { success: false, error: errorMessage };
    }
  }

  // --- MODULE STAFF ---

  private async syncStaff() {
    console.log('  ↳ Sync Staff...');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, full_name, role, pos_pin, avatar_url');

    if (error) {
      throw new Error(`ERREUR SUPABASE (Profiles): ${JSON.stringify(error)}`);
    }
    
    if (!data) return;
    
    const upsert = this.db.prepare(`
      INSERT OR REPLACE INTO local_staff_cache (id, full_name, role, pos_pin, avatar_url)
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((items: StaffMember[]) => {
      this.db.prepare('DELETE FROM local_staff_cache').run();
      for (const item of items) {
        upsert.run(item.id, item.full_name, item.role, item.pos_pin, item.avatar_url);
      }
    });

    transaction(data as unknown as StaffMember[]);
  }

  // --- MODULE CRM (CLIENTS) ---

  private async syncCustomers() {
    console.log('  ↳ Sync Clients...');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await this.supabase
      .from('cust_profiles')
      .select('*');

    if (error) {
       console.warn("⚠️ Attention: Erreur sync clients (Ignoré - Vérifiez les Policies RLS sur cust_profiles):", JSON.stringify(error));
       return; 
    }
    if (!data) return;

    const upsert = this.db.prepare(`
      INSERT OR REPLACE INTO local_customers (id, full_name, phone, address, loyalty_points)
      VALUES (?, ?, ?, ?, ?)
    `);

    // CORRECTION: Utilisation du type Customer[] au lieu de any[]
    const transaction = this.db.transaction((items: Customer[]) => {
      for (const item of items) {
        upsert.run(item.id, item.full_name, item.phone, item.address, item.loyalty_points || 0);
      }
    });

    transaction(data as unknown as Customer[]);
  }

  // --- MODULE CATALOGUE ---

  private async syncCategories() {
    console.log('  ↳ Sync Catégories...');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await this.supabase.from('categories').select('*');
    if (error) throw new Error(`ERREUR Categories: ${JSON.stringify(error)}`);
    
    if (!data) return;
    
    const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_categories (id, name, image_url, display_order) VALUES (?, ?, ?, ?)`);
    const transaction = this.db.transaction((items: Category[]) => {
      for (const item of items) upsert.run(item.id, item.name, item.image_url, item.rank || 0);
    });
    transaction(data as unknown as Category[]);
  }

  private async syncOptionGroups() {
    console.log('  ↳ Sync Option Groups...');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await this.supabase.from('option_groups').select('*');
    if (error) throw new Error(`ERREUR OptionGroups: ${JSON.stringify(error)}`);

    if (!data) return;
    const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_option_groups (id, name, type, min_selection, max_selection) VALUES (?, ?, ?, ?, ?)`);
    const transaction = this.db.transaction((items: OptionGroup[]) => {
      for (const item of items) upsert.run(item.id, item.name, item.type, item.min_selection, item.max_selection);
    });
    transaction(data as unknown as OptionGroup[]);
  }

  private async syncOptionItems() {
    console.log('  ↳ Sync Option Items...');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await this.supabase.from('option_items').select('*');
    if (error) throw new Error(`ERREUR OptionItems: ${JSON.stringify(error)}`);

    if (!data) return;
    const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_option_items (id, group_id, name, price, is_available) VALUES (?, ?, ?, ?, ?)`);
    const transaction = this.db.transaction((items: OptionItem[]) => {
      for (const item of items) upsert.run(item.id, item.group_id, item.name, item.price, item.is_available ? 1 : 0);
    });
    transaction(data as unknown as OptionItem[]);
  }

  private async syncProducts() {
    console.log('  ↳ Sync Produits...');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await this.supabase.from('products').select('*');
    if (error) throw new Error(`ERREUR Products: ${JSON.stringify(error)}`);

    if (!data) return;
    
    const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_products (id, category_id, name, description, price, image_url, is_available, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const transaction = this.db.transaction((items: Product[]) => {
      for (const item of items) upsert.run(
        item.id, 
        item.category_id, 
        item.name, 
        item.description, 
        item.price, 
        item.image_url, 
        item.is_available ? 1 : 0,
        item.type || 'simple'
      );
    });
    transaction(data as unknown as Product[]);
  }

  private async syncProductVariations() {
    console.log('  ↳ Sync Variations...');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await this.supabase.from('product_variations').select('*');
    if (error) throw new Error(`ERREUR ProductVariations: ${JSON.stringify(error)}`);

    if (!data) return;
    const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_product_variations (id, product_id, name, price, is_available, sort_order) VALUES (?, ?, ?, ?, ?, ?)`);
    const transaction = this.db.transaction((items: ProductVariation[]) => {
      for (const item of items) upsert.run(item.id, item.product_id, item.name, item.price, item.is_available ? 1 : 0, item.sort_order);
    });
    transaction(data as unknown as ProductVariation[]);
  }

  private async syncProductOptionLinks() {
    console.log('  ↳ Sync Links...');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await this.supabase.from('product_option_links').select('*');
    if (error) throw new Error(`ERREUR ProductOptionLinks: ${JSON.stringify(error)}`);

    if (!data) return;
    const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_product_option_links (product_id, group_id, sort_order) VALUES (?, ?, ?)`);
    const transaction = this.db.transaction((items: ProductOptionLink[]) => {
      this.db.prepare('DELETE FROM local_product_option_links').run();
      for (const item of items) upsert.run(item.product_id, item.group_id, item.sort_order);
    });
    transaction(data as unknown as ProductOptionLink[]);
  }
}