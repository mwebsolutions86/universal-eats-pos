import React, { useState } from 'react';
import LoginScreen from './components/LoginScreen';
import POSMainScreen from './components/POSMainScreen';
import { StaffMember } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<StaffMember | null>(null);

  // Callback appelé quand le login est réussi
  const handleLoginSuccess = (user: StaffMember) => {
    setCurrentUser(user);
  };

  const handleLogout = () => { 
    setCurrentUser(null);
  };

  // Navigation simple basée sur l'état
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return <POSMainScreen user={currentUser} onLogout={handleLogout} />;
};

export default App;