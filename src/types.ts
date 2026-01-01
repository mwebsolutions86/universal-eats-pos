// src/types.ts

// --- Types Globaux ---

export type UserRole = 'owner' | 'manager' | 'cashier' | 'staff' | 'driver' | 'super_admin' | 'admin';

export interface StaffMember {
  id: string;
  store_id: string | null;
  full_name: string | null;
  role: UserRole | null;
  avatar_url: string | null;
  pos_pin?: string | null;
}

export interface POSSession {
  id: string;
  store_id: string;
  opened_by: string; 
  opened_at: string;
  closed_at?: string | null;
  opening_balance: number;
  closing_balance?: number | null; 
  actual_closing_balance?: number | null; 
  difference?: number | null;
  notes?: string | null;
  status: 'open' | 'closed';
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  address?: string | null;
  loyalty_points?: number;
}

export interface Category {
  id: string;
  name: string;
  image_url?: string | null;
  rank?: number | null;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean | null;
  type?: 'simple' | 'variable' | 'combo';
}

export interface ProductVariation {
  id: string;
  product_id: string | null;
  name: string;
  price: number;
  is_available: boolean | null;
  sort_order: number | null;
}

export interface ProductOptionLink {
  product_id: string;
  group_id: string;
  sort_order: number | null;
}

export interface OptionGroup {
  id: string;
  name: string;
  type: string | null;
  min_selection: number | null;
  max_selection: number | null;
}

export interface OptionItem {
  id: string;
  group_id: string | null;
  name: string;
  price: number | null;
  is_available: boolean | null;
}

// --- Commandes & Panier ---

export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'phone';

export interface CartItem {
  product: Product;
  variation?: ProductVariation;
  qty: number;
}

export interface Order {
  id: string;
  order_number: number;
  customer_id?: string | null;
  customer?: Customer;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  order_type: OrderType;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'out_for_delivery';
  payment_status: 'pending' | 'paid';
  channel: 'web' | 'app' | 'pos';
  created_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  options?: Record<string, unknown> | null; 
}

// --- Interface Bridge Electron ---

export interface IElectronAPI {
  db: {
    checkStaffPin: (pin: string) => Promise<StaffMember | null>;
    getStaffList: () => Promise<StaffMember[]>;
    
    // Synchro Globale
    syncFullPull: () => Promise<{ success: boolean; error?: string }>;
    
    // ✅ Synchro Commandes Live (Web/App)
    syncLiveOrders: () => Promise<{ success: boolean; count?: number; error?: string }>;

    getCategories: () => Promise<Category[]>;
    getProductsByCategory: (categoryId: string) => Promise<Product[]>;
    getProductVariations: (productId: string) => Promise<ProductVariation[]>;
    
    getLiveOrders: () => Promise<Order[]>;
    updateOrderStatus: (orderId: string, status: string) => Promise<void>;

    searchCustomers: (query: string) => Promise<Customer[]>;
    createCustomer: (customer: Omit<Customer, 'id'>) => Promise<Customer>;
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