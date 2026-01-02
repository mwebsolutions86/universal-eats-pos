import * as React from 'react';
import { Order, OrderItem } from '../types';
import { Clock, MapPin, CheckCircle2, AlertCircle, LayoutGrid, Kanban, TableProperties, ChefHat, Bike } from 'lucide-react';

// --- TYPAGE LOCAL ---
interface ItemOptions {
    variation?: {
        name: string;
        price: number;
    };
    [key: string]: unknown;
}

// --- UTILITAIRES EXPORTÉS ---

export const getStatusBadge = (status: string) => {
    switch(status) {
        case 'pending': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200 flex items-center gap-1">En attente</span>
        case 'confirmed': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">Confirmée</span>
        case 'preparing': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-1"><ChefHat size={12}/> Cuisine</span>
        case 'ready': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200 flex items-center gap-1"><CheckCircle2 size={12}/> Prête</span>
        case 'out_for_delivery': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1"><Bike size={12}/> En tournée</span>
        case 'delivered': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200">Livrée</span>
        case 'cancelled': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">Annulée</span>
        default: return <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">{status}</span>
    }
};

export const getElapsedMinutes = (date: string | null | undefined): number => {
    if (!date) return 0;
    return Math.floor((new Date().getTime() - new Date(date).getTime()) / 60000);
};

// --- COMPOSANTS EXPORTÉS ---

// 1. View Switcher
interface ViewSwitcherProps {
  currentView: 'grid' | 'kanban' | 'list';
  onChange: (view: 'grid' | 'kanban' | 'list') => void;
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ currentView, onChange }) => (
  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
    {[
      { id: 'grid', icon: LayoutGrid, title: 'Grille' },
      { id: 'kanban', icon: Kanban, title: 'Kanban' },
      { id: 'list', icon: TableProperties, title: 'Liste' }
    ].map((item) => (
      <button 
        key={item.id}
        // ✅ CORRECTION ICI : Cast explicite au lieu de 'any'
        onClick={() => onChange(item.id as 'grid' | 'kanban' | 'list')} 
        className={`p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${
          currentView === item.id 
            ? 'bg-white dark:bg-slate-900 text-primary shadow-sm ring-1 ring-black/5' 
            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`} 
        title={item.title}
      >
        <item.icon size={18} />
      </button>
    ))}
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
    <div onClick={onClick} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col h-full group active:scale-[0.98]">
      {/* Header */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-slate-700 dark:text-slate-200">#{order.order_number?.toString().slice(-4) || '----'}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border ${
              order.order_type === 'delivery' 
                ? 'bg-blue-50 text-blue-600 border-blue-100' 
                : 'bg-green-50 text-green-600 border-green-100'
            }`}>
              {order.order_type === 'delivery' ? 'Livraison' : 'Emporter'}
            </span>
          </div>
          <div className="text-xs font-bold text-slate-900 dark:text-white mt-1 truncate max-w-[140px]">
            {order.customer_name || 'Client de passage'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {getStatusBadge(order.status)}
          <div className={`flex items-center gap-1 font-bold text-xs ${isLate ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
            {isLate ? <AlertCircle size={12} /> : <Clock size={12} />} 
            {elapsed} min
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={`p-3 flex-1 overflow-y-auto hide-scrollbar ${compact ? 'max-h-[120px]' : 'max-h-[200px]'}`}>
        {!order.items || order.items.length === 0 ? (
           <p className="text-slate-400 text-xs italic text-center py-4">Chargement...</p>
        ) : (
           <ul className="space-y-2">
             {order.items.map((item: OrderItem, idx: number) => {
               const options = item.options as unknown as ItemOptions;
               const variationName = options?.variation?.name;

               return (
                 <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 flex justify-between items-start border-b border-dashed border-slate-100 dark:border-slate-800 pb-1 last:border-0">
                   <div className="flex gap-2">
                     <span className="font-bold bg-slate-100 dark:bg-slate-800 px-1.5 rounded text-slate-900 dark:text-white h-fit min-w-[24px] text-center">{item.quantity}x</span>
                     <span className="leading-tight">
                       {item.product_name}
                       {variationName && (
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            + {variationName}
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
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
         <span className="text-xs text-slate-400 font-medium">Total</span>
         <span className="font-bold text-slate-900 dark:text-white">{order.total_amount.toFixed(2)} <span className="text-[10px] font-normal">DH</span></span>
      </div>
    </div>
  );
};

// 3. Orders List Table
export const OrdersListTable: React.FC<{ orders: Order[]; onOrderClick: (o: Order) => void }> = ({ orders, onOrderClick }) => {
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
            <div className="overflow-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500 font-bold tracking-wider sticky top-0 z-10">
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
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {orders.map((order) => {
                            const elapsed = getElapsedMinutes(order.created_at);
                            const isLate = elapsed > 20;
                            return (
                                <tr key={order.id} onClick={() => onOrderClick(order)} className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                                    <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">#{order.order_number}</td>
                                    <td className="p-4">
                                        <div className={`flex items-center gap-2 font-bold ${isLate ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {isLate ? <AlertCircle size={16} /> : <Clock size={16} />}
                                            {elapsed} min
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900 dark:text-white">{order.customer_name || 'Inconnu'}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">
                                            {order.order_type === 'delivery' ? <MapPin size={16}/> : <CheckCircle2 size={16}/>}
                                            {order.order_type === 'delivery' ? 'Livraison' : 'Emporter'}
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-slate-900 dark:text-white">{order.total_amount} DH</td>
                                    <td className="p-4">{getStatusBadge(order.status)}</td>
                                    <td className="p-4 text-right">
                                        <button className="text-primary font-bold text-xs bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition">
                                            Ouvrir
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