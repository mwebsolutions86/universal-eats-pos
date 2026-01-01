// eslint-disable-next-line import/namespace
import { createClient } from '@supabase/supabase-js';
import { Database } from 'better-sqlite3'; 
import { 
  StaffMember, Category, OptionGroup, OptionItem, 
  Product, ProductVariation, ProductOptionLink, Customer 
} from '../types';

export class SyncService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabase: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabaseAdmin: any; // Client privilégié pour contourner le RLS
  private db: Database;
  private storeId: string | undefined;
  private brandId: string | undefined;

  constructor(db: Database) {
    this.db = db;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Nouvelle variable
    this.storeId = process.env.STORE_ID;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase vars.");
    }
    
    // Client standard (Anon)
    this.supabase = createClient(supabaseUrl, supabaseKey);

    // Client Admin (Service Role) - Uniquement si la clé est présente
    if (serviceRoleKey) {
        console.log("⚡ Mode Admin activé pour la synchro (Service Role Key détectée)");
        this.supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });
    }
  }

  private async initContext() {
    if (!this.storeId) throw new Error("CRITICAL: STORE_ID not set in environment.");

    if (!this.brandId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: store, error } = await this.supabase
        .from('stores')
        .select('brand_id, name')
        .eq('id', this.storeId)
        .single();

        if (error || !store) throw new Error(`Store introuvable: ${JSON.stringify(error)}`);
        this.brandId = store.brand_id;
        
        const setConfig = this.db.prepare("INSERT OR REPLACE INTO local_config (key, value) VALUES (?, ?)");
        setConfig.run('STORE_ID', this.storeId);
        setConfig.run('BRAND_ID', this.brandId);
        setConfig.run('STORE_NAME', store.name);
    }
  }

  // --- SYNC COMMANDES LIVE (Web & App) ---
  async syncLiveOrders(): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
        await this.initContext();
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: orders, error } = await this.supabase
            .from('orders')
            .select(`*, order_items (*)`)
            .eq('store_id', this.storeId)
            .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery']); 

        if (error) throw error;
        if (!orders || orders.length === 0) return { success: true, count: 0 };

        const upsertOrder = this.db.prepare(`
            INSERT OR REPLACE INTO local_orders (
                id, order_number, store_id, customer_id, customer_name, customer_phone, delivery_address,
                order_type, total_amount, status, payment_status, payment_method, channel, created_at, sync_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
        `);

        const deleteItems = this.db.prepare('DELETE FROM local_order_items WHERE order_id = ?');
        
        const insertItem = this.db.prepare(`
            INSERT INTO local_order_items (
                id, order_id, product_id, product_name, quantity, unit_price, total_price, options
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transaction = this.db.transaction((ordersList: any[]) => {
            for (const o of ordersList) {
                upsertOrder.run(
                    o.id, o.order_number, o.store_id, o.user_id,
                    o.customer_name, o.customer_phone, o.delivery_address,
                    o.order_type, o.total_amount, o.status, o.payment_status, o.payment_method,
                    o.channel, o.created_at
                );

                deleteItems.run(o.id);
                if (o.order_items && o.order_items.length > 0) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    for (const item of o.order_items) {
                        insertItem.run(
                            item.id, item.order_id, item.product_id, item.product_name,
                            item.quantity, item.unit_price, item.total_price,
                            JSON.stringify(item.options)
                        );
                    }
                }
            }
        });

        transaction(orders);
        console.log(`📡 Commandes externes sync: ${orders.length}`);
        return { success: true, count: orders.length };

    } catch (e: unknown) {
        const err = e instanceof Error ? e.message : String(e);
        console.error("Erreur syncLiveOrders:", err);
        return { success: false, error: err };
    }
  }

  // --- SYNC GLOBALE ---
  async syncAll(): Promise<{ success: boolean; error?: string }> {
    console.log('🔄 START: Synchro Complète...');
    try {
      await this.initContext();
      await this.syncStaff();
      await this.syncCustomers();
      await this.syncCategories();
      await this.syncOptionGroups();
      await this.syncOptionItems();
      await this.syncProducts();
      await this.syncProductVariations();
      await this.syncProductOptionLinks();
      await this.syncLiveOrders();

      return { success: true };
    } catch (error: unknown) {
      const msg = JSON.stringify(error, null, 2);
      console.error('❌ ERREUR SYNC:', msg);
      return { success: false, error: msg };
    }
  }

  // --- SOUS-MÉTHODES ---
  
  private async syncStaff() {
    console.log('  ↳ Sync Staff...');
    
    // Utiliser le client Admin s'il est dispo (pour contourner RLS), sinon le client standard
    const client = this.supabaseAdmin || this.supabase;

    // 1. Récupérer le Staff du Magasin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: storeStaff, error: err1 } = await client
      .from('profiles')
      .select('id, store_id, full_name, role, pos_pin, avatar_url')
      .eq('store_id', this.storeId);
      
    if (err1) console.error("Erreur sync staff magasin:", err1);

    // 2. Récupérer les Admins Globaux (Super Admin / Owner) - Indépendamment du store_id
    // On élargit la liste des rôles pour couvrir les erreurs de casse (Owner, owner, etc.)
    const adminRoles = [
        'owner', 'Owner', 'OWNER',
        'super_admin', 'Super_Admin', 'Super Admin', 'SUPER_ADMIN',
        'admin', 'Admin', 'ADMIN'
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: admins, error: err2 } = await client
      .from('profiles')
      .select('id, store_id, full_name, role, pos_pin, avatar_url')
      .in('role', adminRoles);

    if (err2) console.error("Erreur sync admins:", err2);

    // 3. Fusionner les listes sans doublons
    const allStaff = [...(storeStaff || []), ...(admins || [])];
    // Dédoublonnage par ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniqueStaff = Array.from(new Map(allStaff.map((item: any) => [item.id, item])).values());

    console.log(`  -> ${uniqueStaff.length} utilisateurs trouvés.`);
    // LOG DE DÉBOGAGE : Affiche les noms trouvés pour vérifier si le Super Admin est là
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log("  -> Liste:", uniqueStaff.map((u: any) => `${u.full_name} (${u.role})`).join(', '));

    const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_staff_cache (id, store_id, full_name, role, pos_pin, avatar_url) VALUES (?, ?, ?, ?, ?, ?)`);
    
    const tx = this.db.transaction((items: StaffMember[]) => {
      this.db.prepare('DELETE FROM local_staff_cache').run();
      for (const item of items) {
        // Conversion PIN en string
        const pinStr = item.pos_pin ? String(item.pos_pin) : null;
        
        // ASTUCE : Si Admin sans store_id, on utilise le store_id local
        const effectiveStoreId = item.store_id || this.storeId; 
        
        upsert.run(item.id, effectiveStoreId, item.full_name, item.role, pinStr, item.avatar_url);
      }
    });
    tx(uniqueStaff as StaffMember[]);
  }

  private async syncCustomers() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await this.supabase.from('cust_profiles').select('*');
    if (data) {
      const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_customers (id, full_name, phone, address, loyalty_points) VALUES (?, ?, ?, ?, ?)`);
      const tx = this.db.transaction((items: Customer[]) => {
        for (const item of items) upsert.run(item.id, item.full_name, item.phone, item.address, item.loyalty_points || 0);
      });
      tx(data as unknown as Customer[]);
    }
  }

  private async syncCategories() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await this.supabase.from('categories').select('*').eq('brand_id', this.brandId);
    if (error) throw error;
    if (!data) return;
    const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_categories (id, name, image_url, display_order) VALUES (?, ?, ?, ?)`);
    const tx = this.db.transaction((items: Category[]) => {
      this.db.prepare('DELETE FROM local_categories').run();
      for (const item of items) upsert.run(item.id, item.name, item.image_url, item.rank || 0);
    });
    tx(data as unknown as Category[]);
  }

  private async syncOptionGroups() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await this.supabase.from('option_groups').select('*').eq('brand_id', this.brandId);
    if (error) throw error;
    if (!data) return;
    const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_option_groups (id, name, type, min_selection, max_selection) VALUES (?, ?, ?, ?, ?)`);
    const tx = this.db.transaction((items: OptionGroup[]) => {
      this.db.prepare('DELETE FROM local_option_groups').run();
      for (const item of items) upsert.run(item.id, item.name, item.type, item.min_selection, item.max_selection);
    });
    tx(data as unknown as OptionGroup[]);
  }

  private async syncOptionItems() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await this.supabase.from('option_items').select('*');
    if (error) throw error;
    if (!data) return;
    const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_option_items (id, group_id, name, price, is_available) VALUES (?, ?, ?, ?, ?)`);
    const rows = this.db.prepare('SELECT id FROM local_option_groups').all() as { id: string }[];
    const validGroupIds = new Set(rows.map(r => r.id));
    const tx = this.db.transaction((items: OptionItem[]) => {
      this.db.prepare('DELETE FROM local_option_items').run();
      for (const item of items) {
        if (item.group_id && validGroupIds.has(item.group_id)) upsert.run(item.id, item.group_id, item.name, item.price, item.is_available ? 1 : 0);
      }
    });
    tx(data as unknown as OptionItem[]);
  }

  private async syncProducts() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await this.supabase.from('products').select('*').eq('brand_id', this.brandId);
    if (error) throw error;
    if (!data) return;
    const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_products (id, category_id, name, description, price, image_url, is_available, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const tx = this.db.transaction((items: Product[]) => {
      this.db.prepare('DELETE FROM local_products').run();
      for (const item of items) upsert.run(item.id, item.category_id, item.name, item.description, item.price, item.image_url, item.is_available ? 1 : 0, item.type || 'simple');
    });
    tx(data as unknown as Product[]);
  }

  private async syncProductVariations() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await this.supabase.from('product_variations').select('*');
    if (error) throw error;
    if (!data) return;
    const rows = this.db.prepare('SELECT id FROM local_products').all() as { id: string }[];
    const validProductIds = new Set(rows.map(r => r.id));
    const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_product_variations (id, product_id, name, price, is_available, sort_order) VALUES (?, ?, ?, ?, ?, ?)`);
    const tx = this.db.transaction((items: ProductVariation[]) => {
      this.db.prepare('DELETE FROM local_product_variations').run();
      for (const item of items) {
        if (item.product_id && validProductIds.has(item.product_id)) upsert.run(item.id, item.product_id, item.name, item.price, item.is_available ? 1 : 0, item.sort_order);
      }
    });
    tx(data as unknown as ProductVariation[]);
  }

  private async syncProductOptionLinks() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await this.supabase.from('product_option_links').select('*');
    if (error) throw error;
    if (!data) return;
    const rows = this.db.prepare('SELECT id FROM local_products').all() as { id: string }[];
    const validProductIds = new Set(rows.map(r => r.id));
    const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_product_option_links (product_id, group_id, sort_order) VALUES (?, ?, ?)`);
    const tx = this.db.transaction((items: ProductOptionLink[]) => {
      this.db.prepare('DELETE FROM local_product_option_links').run();
      for (const item of items) {
        if (validProductIds.has(item.product_id)) upsert.run(item.product_id, item.group_id, item.sort_order);
      }
    });
    tx(data as unknown as ProductOptionLink[]);
  }
}