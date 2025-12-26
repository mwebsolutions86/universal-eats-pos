import React, { useState, useEffect } from 'react';
import type { StaffMember } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: StaffMember) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = () => {
    window.electronAPI.db.getStaffList().then((data: StaffMember[]) => {
      setStaffList(data);
    });
  };

  const handleNumberClick = (num: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
      setError(false);
    }
  };

  const handleLogin = async () => {
    const user = await window.electronAPI.db.checkStaffPin(pin);
    if (user) {
      onLoginSuccess(user); // On remonte l'info au parent
    } else {
      setError(true);
      setPin('');
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    const result = await window.electronAPI.db.syncFullPull();
    setIsSyncing(false);
    if (result.success) {
      loadStaff(); // Recharger la liste après synchro
      alert("Synchronisation terminée avec succès !");
    } else {
      alert("Erreur: " + result.error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white select-none">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-orange-500 mb-2">Universal Eats</h1>
        <p className="text-gray-400">Terminal de Commande</p>
      </div>

      {/* Indicateur PIN */}
      <div className="flex space-x-4 mb-10">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-colors ${
              pin.length > i ? 'bg-orange-500 border-orange-500' : 'bg-transparent border-gray-600'
            } ${error ? 'border-red-500 bg-red-500' : ''}`}
          />
        ))}
      </div>

      {/* Pavé Numérique */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            onClick={() => handleNumberClick(num.toString())}
            className="h-20 text-3xl font-medium bg-gray-800 rounded-xl active:bg-orange-600 active:scale-95 transition-all shadow-lg hover:bg-gray-700"
          >
            {num}
          </button>
        ))}
        
        <button onClick={() => setPin('')} className="h-20 text-xl font-bold text-red-400 bg-gray-800/50 rounded-xl active:scale-95">
          CLR
        </button>
        
        <button onClick={() => handleNumberClick('0')} className="h-20 text-3xl font-medium bg-gray-800 rounded-xl active:bg-orange-600 active:scale-95">
          0
        </button>
        
        <button 
          onClick={handleLogin}
          className="h-20 text-xl font-bold bg-green-600 rounded-xl active:bg-green-700 active:scale-95 shadow-lg shadow-green-900/50"
        >
          OK
        </button>
      </div>

      {/* Bouton Synchro (Maintenance) */}
      <button 
        onClick={handleSync}
        disabled={isSyncing}
        className="mt-12 text-sm text-gray-500 hover:text-white transition-colors flex items-center gap-2"
      >
        {isSyncing ? "Synchronisation en cours..." : "🔄 Synchroniser les données"}
      </button>

      <div className="absolute bottom-4 text-xs text-gray-600">
        v1.0.0 • {staffList.length} staff members loaded
      </div>
    </div>
  );
};

export default LoginScreen;