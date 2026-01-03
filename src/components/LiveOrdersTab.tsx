import * as React from 'react';
import { Order } from '../types';
import { ViewSwitcher, OrderCard, OrdersListTable } from './OrderUI';
import OrderDetailsModal from './OrderDetailsModal';
import { RefreshCw, ChefHat, Bell } from 'lucide-react';

const { useState, useEffect } = React;

export const LiveOrdersTab = () => {
  // Etats
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'list' | 'grid' | 'kanban'>('kanban'); 
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Chargement INTELLIGENT (Locale + Option Cloud)
  const fetchOrders = async (triggerCloudSync = false) => {
    if (triggerCloudSync) setLoading(true);
    try {
      if (window.electronAPI) {
        
        // 1. Si demandé, on lance d'abord une synchro Cloud silencieuse
        if (triggerCloudSync) {
            try {
                await window.electronAPI.db.syncLiveOrders();
            } catch (err) {
                console.warn("Auto-sync ignorée (réseau ?):", err);
            }
        }

        // 2. Ensuite on lit la base locale (C'est ce qui met à jour l'écran)
        const localData = await window.electronAPI.db.getLiveOrders();
        setOrders(localData);
        setLastRefresh(new Date());
      }
    } catch (e) {
      console.error("Erreur fetch live orders:", e);
    } finally {
      if (triggerCloudSync) setLoading(false);
    }
  };

  // Synchro Force (Bouton Rafraîchir)
  const handleForceSync = () => {
    fetchOrders(true); // true = force le cloud
  };

  // Mise à jour statut
  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
      try {
          await window.electronAPI.db.updateOrderStatus(orderId, newStatus);
          // On recharge juste la base locale pour aller vite
          await fetchOrders(false); 
          
          if (selectedOrder && selectedOrder.id === orderId) {
              setSelectedOrder(null); // Fermer modal si fini
          }
      } catch (e) {
          console.error("Erreur update status:", e);
      }
  };

  // Initialisation & Auto-Sync
  useEffect(() => {
    fetchOrders(false);
    fetchOrders(true);

    const interval = setInterval(() => {
        if (window.electronAPI) {
            window.electronAPI.db.syncLiveOrders()
                .then(() => window.electronAPI.db.getLiveOrders())
                .then(data => {
                    setOrders(data);
                    setLastRefresh(new Date());
                })
                .catch(e => console.warn("Echec auto-sync background:", e));
        }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // --- RENDU : VUE KANBAN (CORRIGÉE : PLEINE LARGEUR) ---
  const renderKanban = () => {
    const columns = [
        { id: 'pending', label: 'À Valider', color: 'border-yellow-400 bg-yellow-50' },
        { id: 'confirmed', label: 'Confirmé', color: 'border-blue-400 bg-blue-50' },
        { id: 'preparing', label: 'En Cuisine', color: 'border-orange-400 bg-orange-50' },
        { id: 'ready', label: 'Prêt / Livraison', color: 'border-green-400 bg-green-50' },
    ];

    const getColumnId = (status: string) => {
        if (['pending'].includes(status)) return 'pending';
        if (['confirmed'].includes(status)) return 'confirmed';
        if (['preparing'].includes(status)) return 'preparing';
        if (['ready', 'out_for_delivery'].includes(status)) return 'ready';
        return 'other';
    };

    return (
        // ✅ MODIF: w-full et suppression du scroll horizontal inutile
        <div className="flex gap-3 h-full w-full"> 
            {columns.map(col => {
                const colOrders = orders.filter(o => getColumnId(o.status) === col.id);
                return (
                    // ✅ MODIF: flex-1 et min-w-0 pour forcer le partage équitable de l'espace
                    <div key={col.id} className="flex-1 min-w-0 flex flex-col bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 h-full">
                        <div className={`p-3 border-b-2 ${col.color} font-bold text-slate-700 dark:text-slate-200 flex justify-between items-center bg-white dark:bg-slate-800 rounded-t-xl shrink-0`}>
                            <span className="truncate">{col.label}</span>
                            <span className="bg-slate-200 dark:bg-slate-700 text-xs px-2 py-1 rounded-full ml-2">{colOrders.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
                            {colOrders.length === 0 && (
                                <div className="text-center text-slate-400 text-sm py-10 opacity-50">Aucune commande</div>
                            )}
                            {colOrders.map(order => (
                                <OrderCard key={order.id} order={order} onClick={setSelectedOrder} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
  };

  // --- RENDU : VUE GRILLE ---
  const renderGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
        {orders.map(order => (
            <OrderCard key={order.id} order={order} onClick={setSelectedOrder} />
        ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center shadow-sm shrink-0 z-10">
        <div className="flex items-center gap-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <ChefHat className="text-primary" />
                Cuisine & Commandes
            </h2>
            
            <ViewSwitcher currentView={view} onViewChange={setView} />
        </div>

        <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 hidden md:inline">
                Dernière maj: {lastRefresh.toLocaleTimeString()}
            </span>
            <button 
                onClick={handleForceSync} 
                disabled={loading}
                className={`flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-bold transition-all ${loading ? 'opacity-70' : ''}`}
            >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                {loading ? 'Synchro...' : 'Actualiser'}
            </button>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="flex-1 p-4 overflow-hidden">
        {orders.length === 0 && !loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Bell size={64} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">Aucune commande en cours</p>
                <p className="text-sm">Les nouvelles commandes apparaîtront ici</p>
            </div>
        ) : (
            <>
                {view === 'list' && <div className="h-full overflow-hidden p-2"><OrdersListTable orders={orders} onOrderClick={setSelectedOrder} /></div>}
                {view === 'grid' && <div className="h-full overflow-y-auto custom-scrollbar p-2">{renderGrid()}</div>}
                {view === 'kanban' && renderKanban()}
            </>
        )}
      </div>

      {/* MODAL DETAIL */}
      {selectedOrder && (
        <OrderDetailsModal 
            order={selectedOrder} 
            onClose={() => setSelectedOrder(null)} 
            onUpdateStatus={(status) => handleStatusUpdate(selectedOrder.id, status)}
        />
      )}
    </div>
  );
};

export default LiveOrdersTab; 