import * as React from 'react';
import { Customer } from '../types';

// Extraction des Hooks depuis l'objet React pour garder le code propre
const { useState, useEffect } = React;

interface CustomerModalProps {
  onClose: () => void;
  onSelectCustomer: (customer: Customer) => void;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ onClose, onSelectCustomer }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [view, setView] = useState<'search' | 'create'>('search');
  
  // Formulaire de création
  const [newCustomer, setNewCustomer] = useState({ full_name: '', phone: '', address: '' });
  const [loading, setLoading] = useState(false);

  // Recherche automatique quand on tape
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 1 && view === 'search') {
        search(query);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, view]);

  const search = async (q: string) => {
    try {
      const res = await window.electronAPI.db.searchCustomers(q);
      setResults(res);
    } catch (err) {
      console.error("Erreur recherche client:", err);
    }
  };

  const handleCreate = async () => {
    if (!newCustomer.full_name || !newCustomer.phone) {
      alert("Le nom et le téléphone sont obligatoires.");
      return;
    }
    
    setLoading(true);
    try {
      const created = await window.electronAPI.db.createCustomer(newCustomer);
      onSelectCustomer(created);
    } catch (err) {
      console.error("Erreur création client:", err);
      alert("Erreur lors de la création.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* En-tête */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            {view === 'search' ? '🔍 Identifier le client' : '✨ Nouveau Client'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors">
            ✕
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 overflow-y-auto">
          {view === 'search' ? (
            <>
              <div className="relative mb-4">
                <input
                  autoFocus
                  type="text"
                  placeholder="Nom ou N° de téléphone..."
                  className="w-full text-lg p-4 pl-12 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">🔎</span>
              </div>
              
              <div className="space-y-2 mb-4">
                {results.map(c => (
                  <button
                    key={c.id}
                    onClick={() => onSelectCustomer(c)}
                    className="w-full text-left p-3 hover:bg-orange-50 border border-transparent hover:border-orange-200 rounded-xl flex justify-between items-center group transition-all"
                  >
                    <div>
                      <div className="font-bold text-gray-800">{c.full_name}</div>
                      <div className="text-sm text-gray-500 font-mono">{c.phone}</div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 text-orange-600 font-bold text-sm bg-orange-100 px-3 py-1 rounded-full">
                      Sélectionner
                    </div>
                  </button>
                ))}
                
                {results.length === 0 && query.length > 1 && (
                  <div className="text-center py-8 text-gray-400">
                    <p>Aucun client trouvé.</p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setView('create')}
                className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>+</span> Créer un nouveau client
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nom complet <span className="text-red-500">*</span></label>
                <input 
                  className="w-full p-3 border-2 border-gray-100 focus:border-orange-500 rounded-lg outline-none font-bold text-gray-800"
                  placeholder="Ex: Amine Bennani"
                  value={newCustomer.full_name}
                  onChange={e => setNewCustomer({...newCustomer, full_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Téléphone <span className="text-red-500">*</span></label>
                <input 
                  className="w-full p-3 border-2 border-gray-100 focus:border-orange-500 rounded-lg outline-none font-mono"
                  placeholder="06..."
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Adresse (Livraison)</label>
                <textarea 
                  className="w-full p-3 border-2 border-gray-100 focus:border-orange-500 rounded-lg outline-none"
                  rows={3}
                  placeholder="Quartier, Rue, N°..."
                  value={newCustomer.address}
                  onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                />
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                <button 
                  onClick={() => setView('search')} 
                  className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Retour
                </button>
                <button 
                  onClick={handleCreate} 
                  disabled={loading}
                  className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg shadow-green-200 transition-all disabled:opacity-50"
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerModal;