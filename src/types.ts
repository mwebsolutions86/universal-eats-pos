export interface StaffMember {
  id: string;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
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