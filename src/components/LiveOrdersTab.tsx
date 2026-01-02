import * as React from 'react';
import { Order } from '../types'; // ✅ Import correct depuis src/types.ts
import { ViewSwitcher, OrderCard, OrdersListTable } from './OrderUI'; // ✅ Import local correct
import OrderDetailsModal from './OrderDetailsModal';
import { Utensils, RefreshCw } from 'lucide-react';

const { useState, useEffect } = React;

const KANBAN_COLUMNS = [
  { id: 'todo', title: 'À TRAITER', statuses: ['pending', 'confirmed'], color: 'border-t-4 border-t-yellow-400' },
  { id: 'cooking', title: 'EN CUISINE', statuses: ['preparing'], color: 'border-t-4 border-t-orange-500' },
  { id: 'ready', title: 'PRÊT / EN ATTENTE', statuses: ['ready'], color: 'border-t-4 border-t-green-500' },
  { id: 'delivery', title: 'TERMINÉ', statuses: ['out_for_delivery', 'delivered'], color: 'border-t-4 border-t-blue-500' }
];

const LiveOrdersTab = () => {
  // --- ETAT ---
  const [orders, setOrders] = useState<Order[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'kanban' | 'list'>('kanban');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Suppression de loading/setLoading inutilisés

  // --- CHARGEMENT ---
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
        if(window.electronAPI) {
            const data = await window.electronAPI.db.getLiveOrders();
            setOrders(data);
        }
    } catch (e) { console.error(e); }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await window.electronAPI.db.updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as Order['status'] } : o));
      
      if (selectedOrder?.id === orderId) {
         setSelectedOrder(prev => prev ? { ...prev, status: newStatus as Order['status'] } : null);
      }
    } catch (e) {
      console.error("Erreur update status", e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      
      {/* HEADER KDS */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center shadow-sm shrink-0 z-20">
        <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                👨‍🍳 Cuisine & Commandes
            </h2>
            <span className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-bold border border-primary/20">
                {orders.length} active(s)
            </span>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={fetchOrders} className="p-2 text-slate-400 hover:text-primary transition-colors">
                <RefreshCw size={18} />
            </button>
            <ViewSwitcher currentView={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {/* CONTENU */}
      <div className="flex-1 overflow-hidden p-6 relative">
        {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-700">
                <Utensils size={64} className="mb-4 opacity-50" />
                <p className="font-medium text-lg">Aucune commande en cours</p>
            </div>
        ) : (
            <>
                {viewMode === 'kanban' && (
                <div className="flex h-full gap-6 overflow-x-auto pb-4 snap-x">
                    {KANBAN_COLUMNS.map((col) => {
                        const colOrders = orders.filter(o => col.statuses.includes(o.status));
                        return (
                            <div key={col.id} className={`flex-none w-[340px] flex flex-col rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 snap-start ${col.color}`}>
                                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-900 rounded-t-lg">
                                    <h3 className="font-black text-sm tracking-wide text-slate-600 dark:text-slate-300">{col.title}</h3>
                                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-bold text-slate-600 dark:text-slate-400">{colOrders.length}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                    {colOrders.map(o => (
                                        <OrderCard key={o.id} order={o} onClick={() => setSelectedOrder(o)} compact />
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
                )}

                {viewMode === 'grid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 overflow-y-auto h-full pb-20 custom-scrollbar pr-2">
                        {orders.map(o => (
                            <OrderCard key={o.id} order={o} onClick={() => setSelectedOrder(o)} />
                        ))}
                    </div>
                )}

                {viewMode === 'list' && (
                    <OrdersListTable orders={orders} onOrderClick={setSelectedOrder} />
                )}
            </>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailsModal 
            order={selectedOrder} 
            onClose={() => setSelectedOrder(null)} 
            onUpdateStatus={(newStatus) => handleStatusChange(selectedOrder.id, newStatus)}
        />
      )}

    </div>
  );
};

export default LiveOrdersTab;