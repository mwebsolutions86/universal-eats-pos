import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import POSMainScreen from './components/POSMainScreen';
import { MainLayout } from './layouts/MainLayout';
import { StaffMember, POSSession } from './types';
import { Loader2, AlertCircle } from 'lucide-react';
import { LiveOrdersTab } from './components/LiveOrdersTab'; // ✅ Import nommé corrigé

const { useState, useEffect } = React;

const App = () => {
  // --- ÉTATS ---
  const [user, setUser] = useState<StaffMember | null>(null);
  const [session, setSession] = useState<POSSession | null>(null);
  
  // Navigation & Flow
  const [step, setStep] = useState<'login' | 'open-session' | 'app'>('login');
  const [currentView, setCurrentView] = useState<string>('pos'); // 'pos', 'history', 'settings', etc.
  
  // Login & Setup Inputs
  const [pin, setPin] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  
  // Feedback
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  // --- INITIALISATION SYSTEME ---
  useEffect(() => {
    const init = async () => {
      try {
        console.log("🚀 Démarrage POS Food Tech...");
        if (window.electronAPI) {
            await window.electronAPI.db.syncFullPull();
        }
        setConfigLoaded(true);
      } catch (e) {
        console.error("Erreur init:", e);
        setError("Erreur de connexion à la base de données locale.");
        setConfigLoaded(true); 
      }
    };
    init();
  }, []);

  // --- HANDLERS METIER ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const staff = await window.electronAPI.db.checkStaffPin(pin);
      if (!staff) {
        setError('Code PIN invalide ou personnel non autorisé.');
        setLoading(false);
        return;
      }
      setUser(staff);
      setStep('open-session'); 
      setPin('');
    } catch (err) {
      console.error(err);
      setError('Erreur système lors de l\'authentification.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      const balance = parseFloat(openingBalance);
      if (isNaN(balance)) throw new Error("Montant invalide");

      // ✅ CORRECTION : Ajout des champs nullables obligatoires pour le type DB strict
      const newSession: POSSession = {
        id: uuidv4(),
        store_id: user.store_id || 'UNKNOWN',
        opened_by: user.id,
        opened_at: new Date().toISOString(),
        opening_balance: balance,
        status: 'open',
        actual_closing_balance: null,
        closed_at: null,
        expected_closing_balance: null,
        notes: null
      };

      console.log("💰 Session ouverte :", balance, "DH");
      setSession(newSession);
      setStep('app');
      setCurrentView('pos');
    } catch (err) {
      setError("Le montant du fond de caisse est invalide.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setSession(null);
    setStep('login');
    setPin('');
    setOpeningBalance('');
    setCurrentView('pos');
  };

  // --- RENDU DU CONTENU PRINCIPAL ---
  const renderView = () => {
    switch (currentView) {
        case 'pos':
            return user && session ? (
                <POSMainScreen user={user} session={session} onLogout={handleLogout} />
            ) : null;

        case 'live-orders':
            return <LiveOrdersTab />;
    
        case 'history':
            return (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <h2 className="text-2xl font-bold mb-2">Historique des Commandes</h2>
                    <p>Module en cours de portage depuis l'Admin Panel...</p>
                </div>
            );

        case 'settings':
            return (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <h2 className="text-2xl font-bold mb-2">Paramètres du Terminal</h2>
                    <p>Configuration imprimantes & TPE</p>
                </div>
            );

        default:
            return (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <p>Module {currentView} en construction</p>
                </div>
            );
    }
  };

  if (!configLoaded) {
    return (
      <div className="flex h-screen w-screen bg-slate-950 items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-primary" />
          <p className="text-sm font-medium tracking-widest uppercase text-slate-400">Initialisation Food Tech OS</p>
        </div>
      </div>
    );
  }

  if (step === 'app' && user) {
    return (
      <MainLayout
        user={user}
        currentView={currentView}
        onNavigate={setCurrentView}
        onLogout={handleLogout}
      >
        {renderView()}
      </MainLayout>
    );
  }

  if (step === 'open-session' && user) {
    return (
      <div className="flex h-screen w-screen bg-slate-950 items-center justify-center font-sans animate-in fade-in zoom-in duration-300">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl w-full max-w-md text-center relative border border-slate-800">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <span className="text-2xl">💰</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Ouverture de Caisse</h2>
          <p className="text-slate-500 mb-8">Bonjour {user.full_name}, saisissez le fond de caisse.</p>
          <form onSubmit={handleOpenSession} className="space-y-6">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">DH</span>
              <input
                type="number"
                autoFocus
                min="0"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                className="w-full text-right text-4xl font-bold p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-green-500 outline-none transition-all text-slate-900 dark:text-white placeholder-slate-300"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !openingBalance}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" />}
              {loading ? 'Ouverture...' : 'OUVRIR LA SESSION'}
            </button>
          </form>
          <button onClick={handleLogout} className="mt-6 text-sm text-slate-500 hover:text-red-500 font-medium transition-colors">
            Annuler et changer d'utilisateur
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-950 items-center justify-center font-sans relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
         <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full blur-[128px]" />
         <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[128px]" />
      </div>
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-3xl shadow-2xl w-full max-w-sm text-center relative z-10">
        <div className="w-20 h-20 bg-primary rounded-2xl mx-auto mb-8 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-orange-500/20">
          UE
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Universal Eats POS</h1>
        <p className="text-slate-400 mb-8 text-sm">Terminal Sécurisé v1.0</p>
        <form onSubmit={handleLogin} className="space-y-6">
          <input
            type="password"
            autoFocus
            maxLength={6} 
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Code PIN"
            className="w-full text-center text-3xl tracking-[0.5em] font-bold py-4 bg-transparent border-b-2 border-slate-700 focus:border-primary outline-none transition-all text-white placeholder-slate-600"
          />
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 p-3 rounded-lg border border-red-400/20">
              <AlertCircle size={14} />
              <span className="font-medium">{error}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-orange-900/20 flex items-center justify-center gap-2"
          >
             {loading && <Loader2 className="animate-spin" />}
            {loading ? 'Connexion...' : 'ACCÉDER AU TERMINAL'}
          </button>
        </form>
      </div>
      <div className="absolute bottom-6 text-[10px] text-slate-600 font-mono">
        ID: {uuidv4().split('-')[0].toUpperCase()} • CONNECTÉ
      </div>
    </div>
  );
};

export default App;