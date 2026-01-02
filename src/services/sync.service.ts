// eslint-disable-next-line import/namespace
import { createClient } from '@supabase/supabase-js';
import { Database as SqliteDatabase } from 'better-sqlite3'; 
import { 
  StaffMember, Category, OptionGroup, OptionItem, 
  Product, ProductVariation, ProductOptionLink, Customer 
} from '../types';

// Interface pour typer le retour JSON complexe de la RPC Menu
interface MenuSyncResponse {
  categories: Category[];
  option_groups: OptionGroup[];
  option_items: OptionItem[];
  products: Product[];
  product_variations: ProductVariation[];
  product_option_links: ProductOptionLink[];
}

export class SyncService {
  private supabase: ReturnType<typeof createClient>;
  private db: SqliteDatabase;
  private storeId: string | undefined;
  private brandId: string | undefined;

  constructor(db: SqliteDatabase) {
    this.db = db;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    this.storeId = process.env.STORE_ID;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase vars.");
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  private async initContext() {
    if (!this.storeId) throw new Error("CRITICAL: STORE_ID not set in environment.");

    if (!this.brandId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: store, error } = await this.supabase
          .rpc('get_pos_store_config', { p_store_id: this.storeId })
          .single();

        if (error || !store) {
           console.error("❌ Erreur initContext (Store introuvable):", error);
           throw new Error(`Store introuvable ou accès refusé.`);
        }
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.brandId = (store as any).brand_id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const storeName = (store as any).name;

        console.log(`✅ Context Initialisé: Store=${storeName}, Brand=${this.brandId}`);
        
        const setConfig = this.db.prepare("INSERT OR REPLACE INTO local_config (key, value) VALUES (?, ?)");
        setConfig.run('STORE_ID', this.storeId);
        setConfig.run('BRAND_ID', this.brandId);
        setConfig.run('STORE_NAME', storeName);
    }
  }

  // --- SYNC GLOBALE ---
  async syncAll(): Promise<{ success: boolean; error?: string }> {
    console.log('🔄 START: Synchro Complète (Secure Mode)...');
    try {
      await this.initContext();
      
      await this.syncStaff();
      await this.syncCustomers();
      await this.syncFullMenu();
      await this.syncLiveOrders();
      
      this.subscribeToOrders();

      return { success: true };
    } catch (error: unknown) {
      const msg = JSON.stringify(error, null, 2);
      console.error('❌ ERREUR SYNC:', msg);
      return { success: false, error: msg };
    }
  }

  // --- SYNC COMMANDES LIVE ---
  async syncLiveOrders(): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
        await this.initContext();
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: orders, error } = await this.supabase
            .rpc('get_pos_live_orders', { p_store_id: this.storeId });

        if (error) throw error;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ordersList = orders as any[];

        if (!ordersList || !Array.isArray(ordersList) || ordersList.length === 0) {
            return { success: true, count: 0 };
        }

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
        const transaction = this.db.transaction((list: any[]) => {
            for (const o of list) {
                upsertOrder.run(
                    o.id, o.order_number, o.store_id, o.user_id,
                    o.customer_name, o.customer_phone, o.delivery_address,
                    o.order_type, o.total_amount, o.status, o.payment_status, o.payment_method,
                    o.channel, o.created_at
                );

                deleteItems.run(o.id);
                if (o.order_items && Array.isArray(o.order_items) && o.order_items.length > 0) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    for (const item of o.order_items) {
                        insertItem.run(
                            item.id, item.order_id, item.product_id, item.product_name,
                            item.quantity, item.unit_price, item.total_price,
                            typeof item.options === 'string' ? item.options : JSON.stringify(item.options)
                        );
                    }
                }
            }
        });

        transaction(ordersList);
        console.log(`📡 Commandes externes sync (via RPC): ${ordersList.length}`);
        return { success: true, count: ordersList.length };

    } catch (e: unknown) {
        const err = e instanceof Error ? e.message : String(e);
        console.error("Erreur syncLiveOrders:", err);
        return { success: false, error: err };
    }
  }

  // --- SYNC MENU COMPLET (RPC) ---
  private async syncFullMenu() {
    console.log('  ↳ Sync Menu Complet (via RPC)...');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await this.supabase.rpc('get_pos_menu_sync', { 
        p_brand_id: this.brandId 
    });

    if (error) {
        console.error("❌ Erreur sync menu:", error);
        return;
    }
    if (!data) return;

    // ✅ TYPAGE FORT ICI : On force le type MenuSyncResponse
    // Cela utilise Category, OptionGroup, etc. et satisfait le compilateur
    const menu = data as unknown as MenuSyncResponse;

    const tx = this.db.transaction((m: MenuSyncResponse) => {
        // 1. Categories
        if (m.categories?.length) {
            this.db.prepare('DELETE FROM local_categories').run();
            const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_categories (id, name, image_url, display_order) VALUES (?, ?, ?, ?)`);
            m.categories.forEach((i) => upsert.run(i.id, i.name, i.image_url, i.rank || 0));
        }

        // 2. Option Groups
        if (m.option_groups?.length) {
            this.db.prepare('DELETE FROM local_option_groups').run();
            const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_option_groups (id, name, type, min_selection, max_selection) VALUES (?, ?, ?, ?, ?)`);
            m.option_groups.forEach((i) => upsert.run(i.id, i.name, i.type, i.min_selection, i.max_selection));
        }

        // 3. Option Items
        if (m.option_items?.length) {
            this.db.prepare('DELETE FROM local_option_items').run();
            const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_option_items (id, group_id, name, price, is_available) VALUES (?, ?, ?, ?, ?)`);
            m.option_items.forEach((i) => upsert.run(i.id, i.group_id, i.name, i.price, i.is_available ? 1 : 0));
        }

        // 4. Products
        if (m.products?.length) {
            this.db.prepare('DELETE FROM local_products').run();
            const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_products (id, category_id, name, description, price, image_url, is_available, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
            m.products.forEach((i) => upsert.run(i.id, i.category_id, i.name, i.description, i.price, i.image_url, i.is_available ? 1 : 0, i.type || 'simple'));
        }

        // 5. Variations
        if (m.product_variations?.length) {
            this.db.prepare('DELETE FROM local_product_variations').run();
            const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_product_variations (id, product_id, name, price, is_available, sort_order) VALUES (?, ?, ?, ?, ?, ?)`);
            m.product_variations.forEach((i) => upsert.run(i.id, i.product_id, i.name, i.price, i.is_available ? 1 : 0, i.sort_order));
        }

        // 6. Links
        if (m.product_option_links?.length) {
            this.db.prepare('DELETE FROM local_product_option_links').run();
            const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_product_option_links (product_id, group_id, sort_order) VALUES (?, ?, ?)`);
            m.product_option_links.forEach((i) => upsert.run(i.product_id, i.group_id, i.sort_order));
        }
    });

    tx(menu);
    console.log(`  ✅ Menu synchronisé : ${menu.products?.length || 0} produits.`);
  }

  // --- SYNC STAFF (RPC) ---
  private async syncStaff() {
    console.log('  ↳ Sync Staff (via RPC Secure)...');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: staffList, error } = await this.supabase
      .rpc('get_pos_staff_sync', { p_store_id: this.storeId });

    if (error) {
        console.error("❌ Erreur RPC get_pos_staff_sync:", error);
        return;
    }

    if (!staffList) return;

    // ✅ TYPAGE FORT : On utilise StaffMember[]
    const list = staffList as unknown as StaffMember[];
    console.log(`  -> ${list.length} utilisateurs récupérés.`);
    
    const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_staff_cache (id, store_id, full_name, role, pos_pin, avatar_url) VALUES (?, ?, ?, ?, ?, ?)`);
    
    // La transaction attend maintenant explicitement des StaffMember
    const tx = this.db.transaction((items: StaffMember[]) => {
      this.db.prepare('DELETE FROM local_staff_cache').run();
      for (const item of items) {
        const pinStr = item.pos_pin ? String(item.pos_pin) : null;
        const effectiveStoreId = item.store_id || this.storeId; 
        
        upsert.run(item.id, effectiveStoreId, item.full_name, item.role, pinStr, item.avatar_url);
      }
    });
    
    tx(list);
  }

  // --- REALTIME ---
  public subscribeToOrders() {
    if (!this.storeId) return;
    const channelName = 'public:orders';
    const channels = this.supabase.getChannels();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (channels.find((c: any) => c.topic === `realtime:${channelName}`)) {
        return;
    }
    console.log(`📡 Activation écoute Realtime pour Store ${this.storeId}`);

    this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${this.storeId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (payload: any) => {
          console.log('🔔 Changement détecté (Supabase):', payload.eventType);
          setTimeout(async () => {
             await this.syncLiveOrders();
          }, 1000);
        }
      )
      .subscribe((status: string) => {
        console.log('STATUS REALTIME:', status);
      });
  }

  // --- AUTRES SYNC (Clients) ---
  private async syncCustomers() {
    const { data } = await this.supabase.from('cust_profiles').select('*');
    if (data) {
      const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_customers (id, full_name, phone, address, loyalty_points) VALUES (?, ?, ?, ?, ?)`);
      const tx = this.db.transaction((items: Customer[]) => {
        for (const item of items) upsert.run(item.id, item.full_name, item.phone, item.address, item.loyalty_points || 0);
      });
      tx(data as unknown as Customer[]);
    }
  }
}