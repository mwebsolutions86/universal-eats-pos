import * as React from 'react';
import { Order } from '../types';
import { ViewSwitcher, OrderCard, OrdersListTable } from './OrderUI';
import OrderDetailsModal from './OrderDetailsModal';
import { Utensils } from 'lucide-react';

const { useState, useEffect } = React;

interface LiveOrdersTabProps {
  orders: Order[];
  onProcessOrder: (order: Order) => void;
}

const KANBAN_COLUMNS = [
  { id: 'todo', title: 'À TRAITER', statuses: ['pending', 'confirmed'], color: 'bg-gray-100 border-gray-200', iconColor: 'text-gray-500' },
  { id: 'cooking', title: 'EN CUISINE', statuses: ['preparing'], color: 'bg-orange-50 border-orange-200', iconColor: 'text-orange-500' },
  { id: 'ready', title: 'PRÊT / EN ATTENTE', statuses: ['ready'], color: 'bg-green-50 border-green-200', iconColor: 'text-green-500' },
  { id: 'delivery', title: 'LIVRAISON / FINI', statuses: ['out_for_delivery', 'delivered'], color: 'bg-blue-50 border-blue-200', iconColor: 'text-blue-500' }
];

const LiveOrdersTab: React.FC<LiveOrdersTabProps> = ({ orders: initialOrders }) => {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [viewMode, setViewMode] = useState<'grid' | 'kanban' | 'list'>('kanban');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await window.electronAPI.db.updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as Order['status'] } : o));
      
      if (selectedOrder?.id === orderId) {
         setSelectedOrder(prev => prev ? { ...prev, status: newStatus as Order['status'] } : null);
      }
    } catch (e) {
      alert("Erreur mise à jour");
    }
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm shrink-0 z-20">
        <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            🔥 Live Kitchen
            <span className="bg-orange-100 text-orange-700 text-xs px-2.5 py-0.5 rounded-full border border-orange-200">
                {orders.length}
            </span>
            </h2>
        </div>
        <ViewSwitcher currentView={viewMode} onChange={setViewMode} />
      </div>

      <div className="flex-1 overflow-hidden p-6 relative">
        {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
                <Utensils size={64} className="mb-4 opacity-50" />
                <p className="font-medium text-lg">Aucune commande active</p>
            </div>
        ) : (
            <>
                {viewMode === 'kanban' && (
                <div className="flex h-full gap-6 overflow-x-auto pb-4 snap-x">
                    {KANBAN_COLUMNS.map((col) => {
                        const colOrders = orders.filter(o => col.statuses.includes(o.status));
                        return (
                            <div key={col.id} className={`flex-none w-[340px] flex flex-col rounded-xl border ${col.color} bg-white/50 backdrop-blur-sm snap-start`}>
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className={`font-black text-sm tracking-wide ${col.iconColor}`}>{col.title}</h3>
                                    <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-gray-600 shadow-sm">{colOrders.length}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                    {colOrders.map(o => (
                                        <OrderCard key={o.id} order={o} onClick={() => handleOrderClick(o)} compact />
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
                            <OrderCard key={o.id} order={o} onClick={() => handleOrderClick(o)} />
                        ))}
                    </div>
                )}

                {viewMode === 'list' && (
                    <OrdersListTable orders={orders} onOrderClick={handleOrderClick} />
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