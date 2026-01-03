import { Database } from './types/database.types';

// Raccourcis Supabase
type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];

// --- Types de base mappés sur la DB ---
export type StaffMember = Tables<'profiles'>;
export type Customer = Tables<'cust_profiles'>;
export type Category = Tables<'categories'>;
export type Product = Tables<'products'> & { type: Database["public"]["Enums"]["product_type"] }; 
export type ProductVariation = Tables<'product_variations'>;
export type OptionGroup = Tables<'option_groups'>;
export type OptionItem = Tables<'option_items'>;
export type ProductOptionLink = Tables<'product_option_links'>;
export type Ingredient = Tables<'ingredients'>;
export type ProductIngredient = Tables<'product_ingredients'>;

// --- Extensions UI & Logique ---

export interface OptionGroupWithItems extends OptionGroup {
  items: OptionItem[];
}

export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'phone';

// Panier
export interface CartItem {
  product: Product;
  variation?: ProductVariation | null;
  qty: number;
  options?: OptionItem[]; 
  note?: string; 
  removedIngredients?: string[];
}

// CORRECTION: Remplacement de 'any' par 'Record<string, unknown>' ou 'unknown'
export type OrderItem = Tables<'order_items'> & {
  // Propriétés calculées
  parsed_options?: Record<string, unknown> | null;
};

// Order
export interface Order extends Tables<'orders'> {
  items?: OrderItem[];
  customer?: Customer | null; 
  status: Database["public"]["Enums"]["order_status"] | null;
}

// --- Interface Electron ---
export interface IElectronAPI {
  db: {
    checkStaffPin: (pin: string) => Promise<StaffMember | null>;
    getStaffList: () => Promise<StaffMember[]>;
    
    syncFullPull: () => Promise<{ success: boolean; error?: string }>;
    syncLiveOrders: () => Promise<{ success: boolean; count?: number; error?: string }>;

    getCategories: () => Promise<Category[]>;
    getProductsByCategory: (categoryId: string) => Promise<Product[]>;
    getProductVariations: (productId: string) => Promise<ProductVariation[]>;
    getProductOptions: (productId: string) => Promise<OptionGroupWithItems[]>;
    getProductIngredients: (productId: string) => Promise<Ingredient[]>;
    
    getLiveOrders: () => Promise<Order[]>;
    updateOrderStatus: (orderId: string, status: string) => Promise<void>;
    payOrder: (orderId: string, paymentMethod: string, amountReceived: number) => Promise<boolean>;

    searchCustomers: (query: string) => Promise<Customer[]>;
    createCustomer: (customer: Omit<Customer, 'id' | 'created_at' | 'loyalty_points'>) => Promise<Customer>;
    syncCustomers: () => Promise<void>;

    createOrder: (orderData: {
      items: CartItem[];
      total: number;
      paymentMethod: string;
      amountReceived?: number;
      storeId: string;
      sessionId: string;
      customerId?: string;
      orderType: string;
    }) => Promise<{ success: boolean; orderId?: string; error?: string }>;
  };
  getAppVersion: () => Promise<string>;
  onNetworkStatusChange: (callback: (status: boolean) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}