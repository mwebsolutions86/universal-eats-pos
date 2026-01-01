import * as React from 'react';
import { v4 as uuidv4 } from 'uuid'; // IMPORT CRUCIAL
import POSMainScreen from './components/POSMainScreen';
import { StaffMember, POSSession } from './types';

const { useState, useEffect } = React;

const App = () => {
  // --- ÉTATS ---
  const [user, setUser] = useState<StaffMember | null>(null);
  const [session, setSession] = useState<POSSession | null>(null);
  
  // État Login & Setup
  const [pin, setPin] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [step, setStep] = useState<'login' | 'open-session' | 'pos'>('login');
  
  // Feedback
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  // --- INITIALISATION ---
  useEffect(() => {
    const init = async () => {
      try {
        console.log("🚀 Démarrage POS...");
        await window.electronAPI.db.syncFullPull();
        setConfigLoaded(true);
      } catch (e) {
        console.error("Erreur init:", e);
        setError("Erreur d'initialisation système");
      }
    };
    init();
  }, []);

  // --- HANDLERS ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const staff = await window.electronAPI.db.checkStaffPin(pin);
      
      if (!staff) {
        setError('Code PIN invalide');
        setLoading(false);
        return;
      }
      
      setUser(staff);
      setStep('open-session'); 
      setPin('');

    } catch (err) {
      console.error(err);
      setError('Erreur système lors du login');
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

      const newSession: POSSession = {
        id: uuidv4(), // ✅ CORRECTION ICI : Utilisation de uuidv4()
        store_id: user.store_id || 'UNKNOWN',
        opened_by: user.id,
        opened_at: new Date().toISOString(),
        opening_balance: balance,
        status: 'open'
      };

      console.log("💰 Session ouverte :", balance, "DH");
      setSession(newSession);
      setStep('pos');
    } catch (err) {
      setError("Montant invalide");
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
  };

  // --- RENDU ---

  if (!configLoaded) {
    return (
      <div className="flex h-screen w-screen bg-gray-900 items-center justify-center text-white">
        <div className="animate-pulse flex flex-col items-center">
          <span className="text-4xl mb-4">🔄</span>
          <p>Initialisation du système...</p>
        </div>
      </div>
    );
  }

  // 1. ÉCRAN PRINCIPAL (POS)
  if (step === 'pos' && user && session) {
    return <POSMainScreen user={user} session={session} onLogout={handleLogout} />;
  }

  // 2. ÉCRAN OUVERTURE CAISSE
  if (step === 'open-session' && user) {
    return (
      <div className="flex h-screen w-screen bg-gray-900 items-center justify-center font-sans animate-in fade-in zoom-in duration-300">
        <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
          
          <h2 className="text-2xl font-black text-gray-800 mb-2">Bonjour, {user.full_name} 👋</h2>
          <p className="text-gray-500 mb-8">Veuillez saisir le fond de caisse.</p>

          <form onSubmit={handleOpenSession} className="space-y-6">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">DH</span>
              <input
                type="number"
                autoFocus
                min="0"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                className="w-full text-right text-4xl font-black p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-green-500 focus:bg-white outline-none transition-all text-gray-800 placeholder-gray-300"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !openingBalance}
              className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Ouverture...' : 'OUVRIR LA CAISSE'}
            </button>
          </form>
          
          <button onClick={handleLogout} className="mt-6 text-sm text-gray-400 hover:text-red-500 font-medium underline">
            Annuler
          </button>
        </div>
      </div>
    );
  }

  // 3. ÉCRAN DE CONNEXION (PIN)
  return (
    <div className="flex h-screen w-screen bg-gray-900 items-center justify-center font-sans">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md text-center relative">
        <div className="w-20 h-20 bg-orange-500 rounded-2xl mx-auto mb-6 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-orange-500/40">
          UE
        </div>
        
        <h1 className="text-2xl font-black text-gray-800 mb-2">Universal Eats POS</h1>
        <p className="text-gray-400 mb-8">Identifiez-vous pour continuer</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            autoFocus
            maxLength={6} 
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••••"
            className="w-full text-center text-4xl tracking-[0.5em] font-black p-4 border-b-4 border-gray-200 focus:border-orange-500 outline-none transition-all text-gray-800 placeholder-gray-200"
          />

          {error && (
            <div className="text-red-500 font-bold text-sm bg-red-50 p-3 rounded-lg animate-pulse border border-red-100">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-xl"
          >
            {loading ? 'Connexion...' : 'ENTRER'}
          </button>
        </form>
        
        <div className="mt-8 text-xs text-gray-400 flex justify-between items-center">
          <span>Terminal: <span className="font-mono text-gray-600">POS-01</span></span>
          <span>v1.0.0 (Secure)</span>
        </div>
      </div>
    </div>
  );
};

export default App;