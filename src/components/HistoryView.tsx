import * as React from 'react';
import { Order } from '../types';
import { OrdersListTable } from './OrderUI';
import { Calendar, RefreshCw } from 'lucide-react';
import OrderDetailsModal from './OrderDetailsModal';

const { useState, useEffect } = React;

export const HistoryView = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
          const data = await window.electronAPI.db.getLiveOrders(); 
          setOrders(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center shadow-sm shrink-0">
        <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="text-primary" />
                Historique de la Session
            </h2>
        </div>
        <button 
            onClick={fetchHistory} 
            className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${loading ? 'animate-spin' : ''}`}
        >
            <RefreshCw size={20} className="text-slate-500" />
        </button>
      </div>

      {/* TABLEAU */}
      <div className="flex-1 p-6 overflow-hidden">
        <OrdersListTable orders={orders} onOrderClick={setSelectedOrder} />
      </div>

      {/* MODAL (qui ne crashera plus) */}
      {selectedOrder && (
        <OrderDetailsModal 
            order={selectedOrder} 
            onClose={() => setSelectedOrder(null)} 
            onUpdateStatus={async (status) => {
                await window.electronAPI.db.updateOrderStatus(selectedOrder.id, status);
                setSelectedOrder(null);
                fetchHistory();
            }} 
        />
      )}
    </div>
  );
};

export default HistoryView;