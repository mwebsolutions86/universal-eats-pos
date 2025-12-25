import React from 'react';
import { createRoot } from 'react-dom/client';
import LoginScreen from './components/LoginScreen';
import './index.css';

// Récupération de l'élément HTML où React va s'injecter
const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <LoginScreen />
    </React.StrictMode>
  );
} else {
  console.error("L'élément avec l'ID 'root' est introuvable dans index.html");
}