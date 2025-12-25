import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App'; // On importe App au lieu de LoginScreen
import './index.css';

const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("L'élément avec l'ID 'root' est introuvable dans index.html");
}