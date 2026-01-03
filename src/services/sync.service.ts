import { createClient } from '@supabase/supabase-js';
import { Database } from 'better-sqlite3'; 
import { StaffMember, Category, OptionGroup, OptionItem, Product, ProductVariation, ProductOptionLink, Customer, Ingredient } from '../types';

export class SyncService {
  // CORRECTION 1: On utilise 'any' pour éviter le conflit de namespace/type sur cette version de la lib
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabase: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabaseAdmin: any | null = null;
  private db: Database;
  private storeId: string | undefined;
  private brandId: string | undefined;

  constructor(db: Database) {
    this.db = db;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
    this.storeId = process.env.STORE_ID;

    if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase vars.");
    
    // CORRECTION 2: Suppression du générique <SupabaseDB> qui causait l'erreur "Untyped function calls"
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    if (serviceRoleKey) {
        this.supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { 
            auth: { autoRefreshToken: false, persistSession: false } 
        });
    }
  }

  private async initContext() {
    if (!this.storeId) throw new Error("CRITICAL: STORE_ID not set.");
    if (!this.brandId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: store } = await this.supabase.from('stores').select('brand_id, name').eq('id', this.storeId).single();
        if (store) {
            this.brandId = store.brand_id || undefined;
            const setConfig = this.db.prepare("INSERT OR REPLACE INTO local_config (key, value) VALUES (?, ?)");
            setConfig.run('STORE_ID', this.storeId);
            if(this.brandId) setConfig.run('BRAND_ID', this.brandId);
        }
    }
  }

  async pushOrderStatus(orderId: string, status: string): Promise<boolean> {
    try {
      await this.initContext();
      console.log(`☁️ PUSH Statut: ${orderId} -> ${status}`);
      const client = this.supabaseAdmin || this.supabase;
      const { error } = await client.from('orders').update({ status: status }).eq('id', orderId);
      if (error) { console.error("❌ ECHEC PUSH Supabase:", error); return false; }
      return true;
    } catch (e) { console.error("Erreur pushOrderStatus:", e); return false; }
  }

  async pushPayment(orderId: string, method: string, amount: number): Promise<boolean> {
    try {
      await this.initContext();
      console.log(`☁️ PUSH Paiement: ${orderId}`);
      const client = this.supabaseAdmin || this.supabase;
      const { error } = await client.from('orders').update({ payment_status: 'paid', payment_method: method, amount_received: amount, status: 'confirmed' }).eq('id', orderId);
      if (error) { console.error("❌ ECHEC PUSH Paiement:", error); return false; }
      return true;
    } catch (e) { console.error("Erreur pushPayment:", e); return false; }
  }

  async syncLiveOrders(): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
        await this.initContext();
        if (!this.storeId) return { success: false, error: "Store ID missing" };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: orders, error } = await this.supabase.from('orders').select(`*, order_items (*)`) .eq('store_id', this.storeId).in('status', ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery']); 
        if (error) throw error;
        if (!orders) return { success: true, count: 0 };

        const upsertOrder = this.db.prepare(`INSERT OR REPLACE INTO local_orders (id, order_number, store_id, customer_id, customer_name, customer_phone, delivery_address, order_type, total_amount, status, payment_status, payment_method, channel, created_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`);
        const deleteItems = this.db.prepare('DELETE FROM local_order_items WHERE order_id = ?');
        const insertItem = this.db.prepare(`INSERT INTO local_order_items (id, order_id, product_id, product_name, quantity, unit_price, total_price, options) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transaction = this.db.transaction((ordersList: any[]) => {
            for (const o of ordersList) {
                upsertOrder.run(o.id, o.order_number, o.store_id, o.user_id, o.customer_name, o.customer_phone, o.delivery_address, o.order_type, o.total_amount, o.status, o.payment_status, o.payment_method, o.channel || 'pos', o.created_at);
                deleteItems.run(o.id);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (o.order_items) { for (const item of o.order_items) { insertItem.run(item.id, item.order_id, item.product_id, item.product_name, item.quantity, item.unit_price, item.total_price, JSON.stringify(item.options)); } }
            }
        });
        transaction(orders);
        console.log(`📡 Commandes synchronisées : ${orders.length}`);
        return { success: true, count: orders.length };
    } catch (e: unknown) { console.error("Erreur syncLiveOrders:", e); return { success: false, error: String(e) }; }
  }

  async syncAll(): Promise<{ success: boolean; error?: string }> {
    console.log('🔄 START: Synchro Complète...');
    try {
      await this.initContext();
      await this.syncStaff();
      await this.syncCustomers(); 
      await this.syncCategories();
      await this.syncIngredients();
      await this.syncOptionGroups();
      await this.syncOptionItems();
      await this.syncProducts();
      await this.syncProductVariations();
      await this.syncProductOptionLinks();
      await this.syncProductIngredients();
      await this.syncLiveOrders();
      this.subscribeToOrders();
      return { success: true };
    } catch (error: unknown) { console.error('❌ ERREUR SYNC:', error); return { success: false, error: String(error) }; }
  }

  public subscribeToOrders() {
    if (!this.storeId) return;
    this.supabase.removeAllChannels();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.supabase.channel('public:orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${this.storeId}` }, async (payload: any) => { console.log('🔔 UPDATE REALTIME:', payload.eventType); setTimeout(async () => { await this.syncLiveOrders(); }, 500); }).subscribe();
  }

  // --- SYNC DATA ---
  
  // CORRECTION 3: Guard Clauses pour remplacer les '!'
  private async syncStaff() { 
      if (!this.storeId) return; 
      const client = this.supabaseAdmin || this.supabase; 
      const { data } = await client.from('profiles').select('*').eq('store_id', this.storeId); 
      if(data) { 
          const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_staff_cache (id, store_id, full_name, role, pos_pin, avatar_url) VALUES (?, ?, ?, ?, ?, ?)`); 
          const tx = this.db.transaction((items: StaffMember[]) => { for (const item of items) upsert.run(item.id, item.store_id, item.full_name, item.role, item.pos_pin, item.avatar_url); }); 
          tx(data as unknown as StaffMember[]); 
      } 
  }

  private async syncCustomers() { 
      const { data } = await this.supabase.from('cust_profiles').select('*'); 
      if(data) { 
          const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_customers (id, full_name, phone, address, loyalty_points) VALUES (?, ?, ?, ?, ?)`); 
          const tx = this.db.transaction((items: Customer[]) => { for (const item of items) upsert.run(item.id, item.full_name, item.phone, item.address, item.loyalty_points || 0); }); 
          tx(data as unknown as Customer[]); 
      } 
  }

  private async syncCategories() { 
      if (!this.brandId) return;
      const { data } = await this.supabase.from('categories').select('*').eq('brand_id', this.brandId); 
      if(data) { 
          const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_categories (id, name, image_url, display_order) VALUES (?, ?, ?, ?)`); 
          const tx = this.db.transaction((items: Category[]) => { for (const i of items) upsert.run(i.id, i.name, i.image_url, i.rank); }); 
          tx(data as unknown as Category[]); 
      } 
  }

  private async syncOptionGroups() { 
      if (!this.brandId) return;
      const { data } = await this.supabase.from('option_groups').select('*').eq('brand_id', this.brandId); 
      if(data) { 
          const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_option_groups (id, name, type, min_selection, max_selection) VALUES (?, ?, ?, ?, ?)`); 
          const tx = this.db.transaction((items: OptionGroup[]) => { for (const i of items) upsert.run(i.id, i.name, i.type, i.min_selection, i.max_selection); }); 
          tx(data as unknown as OptionGroup[]); 
      } 
  }

  private async syncOptionItems() { 
      const { data } = await this.supabase.from('option_items').select('*'); 
      if(data) { 
          const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_option_items (id, group_id, name, price, is_available) VALUES (?, ?, ?, ?, ?)`); 
          const tx = this.db.transaction((items: OptionItem[]) => { for (const i of items) upsert.run(i.id, i.group_id, i.name, i.price, i.is_available?1:0); }); 
          tx(data as unknown as OptionItem[]); 
      } 
  }
  
  private async syncProducts() { 
      if (!this.brandId) return;
      const { data } = await this.supabase.from('products').select('*').eq('brand_id', this.brandId); 
      if(data) { 
          const fallback = this.db.prepare('SELECT id FROM local_categories LIMIT 1').get() as {id: string}; 
          const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_products (id, category_id, name, description, price, image_url, is_available, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`); 
          
          const tx = this.db.transaction((items: Product[]) => { 
              for (const i of items) {
                  upsert.run(
                      i.id, 
                      i.category_id || fallback?.id, 
                      i.name, 
                      i.description, 
                      i.price, 
                      i.image_url, 
                      i.is_available?1:0, 
                      i.type||'simple'
                  );
              }
          }); 
          // CORRECTION 4: Suppression du 'as any', typage plus sûr
          tx(data as unknown as Product[]); 
      } 
  }

  private async syncProductVariations() { 
      const { data } = await this.supabase.from('product_variations').select('*'); 
      if(data) { 
          const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_product_variations (id, product_id, name, price, is_available, sort_order) VALUES (?, ?, ?, ?, ?, ?)`); 
          const tx = this.db.transaction((items: ProductVariation[]) => { for (const i of items) upsert.run(i.id, i.product_id, i.name, i.price, i.is_available?1:0, i.sort_order); }); 
          tx(data as unknown as ProductVariation[]); 
      } 
  }

  private async syncProductOptionLinks() { 
      const { data } = await this.supabase.from('product_option_links').select('*'); 
      if(data) { 
          const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_product_option_links (product_id, group_id, sort_order) VALUES (?, ?, ?)`); 
          const tx = this.db.transaction((items: ProductOptionLink[]) => { for (const i of items) upsert.run(i.product_id, i.group_id, i.sort_order); }); 
          tx(data as unknown as ProductOptionLink[]); 
      } 
  }
  
  private async syncIngredients() {
      if (!this.brandId) return;
      const { data } = await this.supabase.from('ingredients').select('*').eq('brand_id', this.brandId);
      if(data) {
          const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_ingredients (id, name, is_available) VALUES (?, ?, ?)`);
          const tx = this.db.transaction((items: Ingredient[]) => { for (const i of items) upsert.run(i.id, i.name, i.is_available?1:0); });
          tx(data as unknown as Ingredient[]);
      }
  }

  private async syncProductIngredients() {
      const { data } = await this.supabase.from('product_ingredients').select('*');
      if(data) {
          const upsert = this.db.prepare(`INSERT OR REPLACE INTO local_product_ingredients (product_id, ingredient_id) VALUES (?, ?)`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tx = this.db.transaction((items: any[]) => { for (const i of items) upsert.run(i.product_id, i.ingredient_id); });
          tx(data);
      }
  }
}