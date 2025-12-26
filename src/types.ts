// --- Types Globaux ---

export interface StaffMember {
  id: string;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
  pos_pin?: string | null;
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  address?: string | null;
  loyalty_points?: number;
}

// --- Interface du Pont (Bridge) Electron <-> React ---
export interface IElectronAPI {
  db: {
    // Auth & Staff
    checkStaffPin: (pin: string) => Promise<StaffMember | null>;
    getStaffList: () => Promise<StaffMember[]>;
    syncFullPull: () => Promise<{ success: boolean; error?: string }>;
    
    // Catalogue
    getCategories: () => Promise<Category[]>;
    getProductsByCategory: (categoryId: string) => Promise<Product[]>;
    getProductVariations: (productId: string) => Promise<ProductVariation[]>;
    
    // Commandes Live (Web/App)
    getLiveOrders: () => Promise<Order[]>;
    updateOrderStatus: (orderId: string, status: string) => Promise<void>;

    // CRM Clients
    searchCustomers: (query: string) => Promise<Customer[]>;
    createCustomer: (customer: Omit<Customer, 'id'>) => Promise<Customer>;
    syncCustomers: () => Promise<void>;
  };
  getAppVersion: () => Promise<string>;
  onNetworkStatusChange: (callback: (status: boolean) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

// --- Types Métier (Miroirs Supabase) ---

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

export interface ProductOptionLink {
  product_id: string;
  group_id: string;
  sort_order: number | null;
}

// --- Types Commandes ---

export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'phone';

export interface Order {
  id: string;
  order_number: number;
  // Infos Client
  customer_id?: string | null;
  customer?: Customer; // Objet complet pour affichage facile
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  // Infos Commande
  order_type: OrderType;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
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
  // JSON parsé des options choisies (ex: { "Sauce": "Algérienne", "Taille": "L" })
  options?: Record<string, unknown> | null; 
}