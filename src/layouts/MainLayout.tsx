import * as React from 'react'; // ✅ Correction ici
import { Sidebar } from '../components/Sidebar';
import { StaffMember } from '../types';

interface MainLayoutProps {
  children: React.ReactNode;
  user: StaffMember;
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

export const MainLayout = ({ children, user, currentView, onNavigate, onLogout }: MainLayoutProps) => {
  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar Fixe à Gauche */}
      <Sidebar 
        user={user} 
        currentView={currentView} 
        onNavigate={onNavigate} 
        onLogout={onLogout} 
      />

      {/* Zone de Contenu Principale */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-50/50 dark:bg-slate-950">
        <div className="flex-1 overflow-auto p-0 relative">
          {children}
        </div>
      </main>
    </div>
  );
};