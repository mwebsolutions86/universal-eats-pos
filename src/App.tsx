import * as React from 'react';
import POSMainScreen from './components/POSMainScreen';
import { StaffMember } from './types';

// Extraction des hooks
const { useState, useEffect } = React;

const App = () => {
  const [user, setUser] = useState<StaffMember | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const staff = await window.electronAPI.db.checkStaffPin(pin);
      
      if (staff) {
        setUser(staff);
      } else {
        setError('Code PIN incorrect');
      }
    } catch (err) {
      console.error(err);
      setError('Erreur système');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const sync = async () => {
      console.log("Tentative de synchro au démarrage...");
      try {
          await window.electronAPI.db.syncFullPull();
      } catch (e) {
          console.error("Erreur sync init:", e);
      }
    };
    sync();
  }, []);

  if (user) {
    return <POSMainScreen user={user} onLogout={() => setUser(null)} />;
  }

  return (
    <div className="flex h-screen w-screen bg-gray-900 items-center justify-center font-sans">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md text-center">
        <div className="w-20 h-20 bg-orange-500 rounded-2xl mx-auto mb-6 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-orange-500/40">
          UE
        </div>
        
        <h1 className="text-2xl font-black text-gray-800 mb-2">Universal Eats POS</h1>
        <p className="text-gray-400 mb-8">Veuillez entrer votre code PIN (6 chiffres)</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            autoFocus
            maxLength={6} 
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="000000"
            className="w-full text-center text-4xl tracking-[0.5em] font-black p-4 border-b-4 border-gray-200 focus:border-orange-500 outline-none transition-all text-gray-800 placeholder-gray-200"
          />

          {error && (
            <div className="text-red-500 font-bold text-sm bg-red-50 p-2 rounded-lg animate-pulse">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || pin.length < 6}
            className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? 'Connexion...' : 'ENTRER'}
          </button>
        </form>
        
        <div className="mt-8 text-xs text-gray-400">
          ID Terminal: <span className="font-mono text-gray-600">POS-01</span> • v1.0.0
        </div>
      </div>
    </div>
  );
};

export default App;