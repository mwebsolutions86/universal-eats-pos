import * as React from 'react';
import { Order, OrderItem } from '../types';
import { Clock, MapPin, Bike, ChefHat, CheckCircle2, AlertCircle, LayoutGrid, Kanban, TableProperties } from 'lucide-react';

// --- TYPAGE LOCAL POUR LES OPTIONS ---
// Permet d'accéder à variation.name sans @ts-ignore
interface ItemOptions {
    variation?: {
        name: string;
        price: number;
    };
    [key: string]: unknown;
}

// --- UTILITAIRES ---

export const getStatusBadge = (status: string) => {
    switch(status) {
        case 'pending': return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold border border-yellow-200 flex items-center gap-1">En attente</span>
        case 'confirmed': return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold border border-blue-200 flex items-center gap-1">Confirmée</span>
        case 'preparing': return <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-bold border border-orange-200 flex items-center gap-1"><ChefHat size={12}/> Cuisine</span>
        case 'ready': return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold border border-green-200 flex items-center gap-1"><CheckCircle2 size={12}/> Prête</span>
        case 'out_for_delivery': return <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-bold border border-purple-200 flex items-center gap-1"><Bike size={12}/> En tournée</span>
        case 'delivered': return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-bold border border-gray-200">Livrée</span>
        case 'cancelled': return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold border border-red-200">Annulée</span>
        default: return <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full font-bold">{status}</span>
    }
};

export const getElapsedMinutes = (date: string | null | undefined): number => {
    if (!date) return 0;
    return Math.floor((new Date().getTime() - new Date(date).getTime()) / 60000);
};

// --- COMPOSANTS UI ---

// 1. View Switcher
interface ViewSwitcherProps {
  currentView: 'grid' | 'kanban' | 'list';
  onChange: (view: 'grid' | 'kanban' | 'list') => void;
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ currentView, onChange }) => (
  <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
    <button onClick={() => onChange('grid')} className={`p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${currentView === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} title="Grille">
      <LayoutGrid size={18} />
    </button>
    <button onClick={() => onChange('kanban')} className={`p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${currentView === 'kanban' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} title="Kanban">
      <Kanban size={18} />
    </button>
    <button onClick={() => onChange('list')} className={`p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${currentView === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} title="Liste">
      <TableProperties size={18} />
    </button>
  </div>
);

// 2. Order Card
interface OrderCardProps {
  order: Order;
  onClick: () => void;
  compact?: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onClick, compact }) => {
  const elapsed = getElapsedMinutes(order.created_at);
  const isLate = elapsed > 20;

  return (
    <div onClick={onClick} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col h-full group">
      {/* Header */}
      <div className="p-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-gray-800">#{order.order_number?.toString().slice(-4) || '----'}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border ${order.order_type === 'delivery' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
              {order.order_type === 'delivery' ? 'Livraison' : 'Emporter'}
            </span>
          </div>
          <div className="text-xs font-bold text-gray-900 mt-1 truncate max-w-[140px]">
            {order.customer_name || 'Client Inconnu'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {getStatusBadge(order.status)}
          <div className={`flex items-center gap-1 font-bold text-xs ${isLate ? 'text-red-600 animate-pulse' : 'text-gray-500'}`}>
            {/* Utilisation de AlertCircle pour les retards */}
            {isLate ? <AlertCircle size={12} /> : <Clock size={12} />} 
            {elapsed} min
          </div>
        </div>
      </div>

      {/* Body : Items */}
      <div className={`p-3 flex-1 overflow-y-auto custom-scrollbar ${compact ? 'max-h-[120px]' : 'max-h-[200px]'}`}>
        {!order.items || order.items.length === 0 ? (
           <p className="text-gray-400 text-xs italic text-center py-4">Synchronisation des détails...</p>
        ) : (
           <ul className="space-y-2">
             {order.items.map((item: OrderItem, idx: number) => {
               // Typage sécurisé des options
               const options = item.options as unknown as ItemOptions;
               const variationName = options?.variation?.name;

               return (
                 <li key={idx} className="text-xs text-gray-700 flex justify-between items-start border-b border-dashed border-gray-100 pb-1 last:border-0">
                   <div className="flex gap-2">
                     <span className="font-bold bg-gray-100 px-1.5 rounded text-gray-900 h-fit min-w-[24px] text-center">{item.quantity}x</span>
                     <span className="leading-tight">
                       {item.product_name}
                       {variationName && (
                          <span className="block text-[10px] text-gray-400 mt-0.5">
                            {variationName}
                          </span>
                       )}
                     </span>
                   </div>
                 </li>
               );
             })}
           </ul>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
         <span className="text-xs text-gray-400 font-medium">Total</span>
         <span className="font-black text-gray-900">{order.total_amount.toFixed(2)} <span className="text-[10px] font-normal">DH</span></span>
      </div>
    </div>
  );
};

// 3. Orders List Table
export const OrdersListTable: React.FC<{ orders: Order[]; onOrderClick: (o: Order) => void }> = ({ orders, onOrderClick }) => {
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
            <div className="overflow-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-bold tracking-wider sticky top-0 z-10">
                        <tr>
                            <th className="p-4"># ID</th>
                            <th className="p-4">Timer</th>
                            <th className="p-4">Client</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Total</th>
                            <th className="p-4">Statut</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {orders.map((order) => {
                            const elapsed = getElapsedMinutes(order.created_at);
                            const isLate = elapsed > 20;
                            return (
                                <tr key={order.id} onClick={() => onOrderClick(order)} className="hover:bg-blue-50/50 cursor-pointer transition-colors">
                                    <td className="p-4 font-mono font-bold text-gray-700">#{order.order_number}</td>
                                    <td className="p-4">
                                        <div className={`flex items-center gap-2 font-bold ${isLate ? 'text-red-500' : 'text-gray-600'}`}>
                                            {isLate ? <AlertCircle size={16} /> : <Clock size={16} />}
                                            {elapsed} min
                                        </div>
                                        <div className="text-xs text-gray-400 mt-0.5">
                                            {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-gray-900">{order.customer_name || 'Inconnu'}</div>
                                        <div className="text-xs text-gray-500">{order.customer_phone}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
                                            {order.order_type === 'delivery' ? <MapPin size={16} className="text-blue-500"/> : <CheckCircle2 size={16} className="text-green-500"/>}
                                            {order.order_type === 'delivery' ? 'Livraison' : 'Emporter'}
                                        </div>
                                    </td>
                                    <td className="p-4 font-black text-gray-800">{order.total_amount} DH</td>
                                    <td className="p-4">{getStatusBadge(order.status)}</td>
                                    <td className="p-4 text-right">
                                        <button className="text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100">
                                            Gérer
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};