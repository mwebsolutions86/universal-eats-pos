import * as React from 'react'; // ✅ Correction : Import compatible TypeScript strict
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  QrCode, 
  Settings, 
  LogOut, 
  Store, 
  HistoryIcon, 
  Users,
  // Bike, // ❌ Supprimé car inutilisé pour l'instant
  TrendingUp 
} from 'lucide-react';
import { StaffMember } from '../types'; 

interface SidebarProps {
  user: StaffMember;
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

export function Sidebar({ user, currentView, onNavigate, onLogout }: SidebarProps) {
  // --- LOGIQUE DE DROITS D'ACCÈS ---
  const isPrivileged = user.role === 'manager' || user.role === 'admin' || user.role === 'super_admin'; 
  
  const commonItems = [
    { name: 'Caisse (Live)', id: 'pos', icon: LayoutDashboard },
    { name: 'Commandes (Live)', id: 'live-orders', icon: LayoutDashboard },
    { name: 'Historique', id: 'History', icon: HistoryIcon },
    { name: 'QR Codes', id: 'qr-codes', icon: QrCode }, 
  ];

  const adminItems = [
    { name: 'Analytics', id: 'analytics', icon: TrendingUp },
    { name: 'Gestion Menu', id: 'menu', icon: UtensilsCrossed },
    { name: 'Personnel', id: 'users', icon: Users },
    { name: 'Paramètres', id: 'settings', icon: Settings },
  ];

  // Fusion des menus selon les droits
  const menuItems = isPrivileged 
    ? [...commonItems, ...adminItems] 
    : commonItems;

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-full border-r border-slate-800 shadow-xl">
      
      {/* HEADER LOGO */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-white/10 p-2 rounded-lg">
            <Store size={24} className="text-primary" />
        </div>
        <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">Universal Eats</h1>
            <p className="text-xs text-slate-400 font-medium">
                {isPrivileged ? 'Administration' : 'Terminal Caisse'}
            </p>
        </div>
      </div>

      {/* NAVIGATION TACTILE OPTIMISÉE */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto hide-scrollbar">
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3 px-4 py-4 w-full text-left rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-primary text-white font-bold shadow-lg shadow-orange-500/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon 
                size={22} 
                className={`transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} 
              />
              <span className="text-sm">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* FOOTER USER */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="mb-4 px-4">
            <p className="text-sm text-white font-semibold">{user.full_name}</p>
            <p className="text-xs text-slate-500 capitalize">{user.role}</p>
        </div>
        <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition border border-transparent hover:border-red-500/20"
        >
            <LogOut size={20} />
            <span className="font-medium">Fermer Session</span>
        </button>
      </div>

    </aside>
  );
}