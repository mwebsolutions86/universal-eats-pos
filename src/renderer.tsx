import './index.css';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Fonction de démarrage
const startApp = () => {
    const container = document.getElementById('root');
    
    if (!container) {
        console.error("ERREUR CRITIQUE: Impossible de trouver <div id='root'>. Réessai...");
        return;
    }

    const root = createRoot(container);
    root.render(<App />);
};

// --- LE FIX EST ICI ---
// On vérifie si le DOM est déjà chargé ou s'il faut l'attendre
if (document.readyState === 'loading') {
    // Si ça charge encore, on attend l'événement
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    // Si c'est déjà prêt, on lance tout de suite
    startApp();
}