import React, { useState } from 'react';
import { Order } from '../types';

interface LiveOrdersTabProps {
  orders: Order[]; // On passera les commandes reçues via props
  onProcessOrder: (order: Order) => void;
}

const LiveOrdersTab: React.FC<LiveOrdersTabProps> = ({ orders, onProcessOrder }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('all');

  // Filtrage simple
  const filteredOrders = orders.filter(o => {
    if (filter === 'all') return true;
    return o.status === filter;
  });

  return (
    <div className="flex-1 bg-gray-100 flex flex-col h-full overflow-hidden">
      {/* Header Filtres */}
      <div className="bg-white p-4 border-b border-gray-200 flex gap-4 overflow-x-auto">
        <button 
          onClick={() => setFilter('all')}
          className={`px-6 py-2 rounded-full font-bold text-sm whitespace-nowrap ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          Tout ({orders.length})
        </button>
        <button 
          onClick={() => setFilter('pending')}
          className={`px-6 py-2 rounded-full font-bold text-sm whitespace-nowrap ${filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          En attente ({orders.filter(o => o.status === 'pending').length})
        </button>
        <button 
          onClick={() => setFilter('confirmed')}
          className={`px-6 py-2 rounded-full font-bold text-sm whitespace-nowrap ${filter === 'confirmed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          Confirmées
        </button>
      </div>

      {/* Liste des cartes */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map(order => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between h-64 hover:shadow-md transition-shadow">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase mb-1 ${
                      order.channel === 'web' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {order.channel}
                    </span>
                    <h3 className="font-bold text-lg text-gray-900">#{order.order_number}</h3>
                  </div>
                  <span className="font-mono font-bold text-xl text-gray-900">{order.total_amount.toFixed(2)} DH</span>
                </div>
                
                <div className="space-y-1 text-sm text-gray-600">
                  <p className="flex items-center gap-2">
                    👤 <span className="font-medium text-gray-900">{order.customer_name || "Invité"}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    📍 <span className="truncate">{order.delivery_address || "Sur Place / Emporter"}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    💰 <span className={order.payment_status === 'paid' ? "text-green-600 font-bold" : "text-orange-600 font-bold"}>
                      {order.payment_status === 'paid' ? "PAYÉ EN LIGNE" : "À ENCAISSER (CASH)"}
                    </span>
                  </p>
                </div>
              </div>

              <button 
                onClick={() => onProcessOrder(order)}
                className="w-full mt-4 bg-gray-900 text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors"
              >
                {order.payment_status === 'paid' ? '🖨️ IMPRIMER / CUISINE' : '💵 ENCAISSER'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LiveOrdersTab;