// --- Types Globaux ---

export interface StaffMember {
  id: string;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
  pos_pin?: string | null; // Ajouté pour la synchronisation
}

export interface IElectronAPI {
  db: {
    checkStaffPin: (pin: string) => Promise<StaffMember | null>;
    getStaffList: () => Promise<StaffMember[]>;
    syncStaff: (staffData: StaffMember[]) => Promise<void>;
    syncFullPull: () => Promise<{ success: boolean; error?: string }>;
  };
  getAppVersion: () => Promise<string>;
  onNetworkStatusChange: (callback: (status: boolean) => void) => void;
}

// On garde la déclaration globale pour que Window soit reconnu partout
declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

// --- Types Supabase (Miroirs des tables pour la Synchro) ---
export interface Category {
  id: string;
  name: string;
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