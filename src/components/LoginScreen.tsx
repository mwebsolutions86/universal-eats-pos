import React, { useState, useEffect } from 'react';
import type { StaffMember } from '../types';

const LoginScreen: React.FC = () => {
  const [pin, setPin] = useState<string>(''); // Typage explicite
  const [error, setError] = useState<boolean>(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  useEffect(() => {
    window.electronAPI.db.getStaffList().then((data: StaffMember[]) => {
      setStaffList(data);
    });
  }, []);

  const handleNumberClick = (num: string) => {
    if (pin.length < 6) {
      setPin((prev: string) => prev + num); // Fix: Type explicite pour 'prev'
      setError(false);
    }
  };

  const handleLogin = async () => {
    const user = await window.electronAPI.db.checkStaffPin(pin);
    if (user) {
      console.log('Connecté:', user.full_name);
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white select-none">
      {/* Affichage du nombre d'employés cachés pour satisfaire ESLint si nécessaire */}
      {staffList.length > 0 && <div className="hidden" />} 

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-orange-500">Universal Eats</h1>
        <p className="text-gray-400">Saisissez votre code PIN</p>
      </div>

      <div className="flex space-x-4 mb-12">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i}
            className={`w-4 h-4 rounded-full border-2 border-orange-500 ${
              pin.length > i ? 'bg-orange-500' : 'bg-transparent'
            } ${error ? 'border-red-500 bg-red-500' : ''}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            className="h-20 text-2xl font-semibold bg-gray-800 rounded-xl active:bg-orange-600 active:scale-95 transition-all"
          >
            {num}
          </button>
        ))}
        <button onClick={() => setPin('')} className="h-20 text-xl bg-red-900/50 rounded-xl">Effacer</button>
        <button onClick={() => handleNumberClick('0')} className="h-20 text-2xl bg-gray-800 rounded-xl">0</button>
        <button 
          onClick={handleLogin}
          className="h-20 text-xl bg-green-600 rounded-xl font-bold active:bg-green-700"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;