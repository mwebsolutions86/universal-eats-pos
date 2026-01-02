import * as React from 'react';
import { Order, OrderItem } from '../types'; // ✅ OrderItem est maintenant utilisé
import { Clock, User, ChevronRight, AlertCircle, CheckCircle2, Bike, ChefHat } from 'lucide-react'; // ✅ User est maintenant utilisé

// --- HELPER : Rendu des Options ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const renderOrderItemDetails = (options: any) => {
  if (!options) return null;

  let parsedOpts = options;
  if (typeof options === 'string') {
      try { parsedOpts = JSON.parse(options); } catch { return null; }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemsRender: any[] = [];

  if (parsedOpts.variation) {
      itemsRender.push(
          <span key="var" className="block text-xs font-bold text-slate-600 dark:text-slate-400">
              📏 {parsedOpts.variation.name}
          </span>
      );
  }

  const supps = Array.isArray(parsedOpts) ? parsedOpts : (parsedOpts.options || []);
  
  if (Array.isArray(supps) && supps.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const names = supps.map((s: any) => s.name).join(', ');
      itemsRender.push(
          <span key="opts" className="block text-[10px] text-slate-500 italic mt-0.5 line-clamp-2">
              + {names}
          </span>
      );
  }

  return itemsRender.length > 0 ? <div className="mt-1 ml-1">{itemsRender}</div> : null;
};

// --- BADGES STATUT ---
export const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    preparing: 'bg-orange-100 text-orange-800 border-orange-200',
    ready: 'bg-green-100 text-green-800 border-green-200',
    delivered: 'bg-slate-100 text-slate-800 border-slate-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    out_for_delivery: 'bg-purple-100 text-purple-800 border-purple-200'
  };
  
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmée',
    preparing: 'En cuisine',
    ready: 'Prête',
    delivered: 'Livrée',
    cancelled: 'Annulée',
    out_for_delivery: 'En livraison'
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {labels[status] || status}
    </span>
  );
};

// --- TABLEAU PRINCIPAL ---
interface OrdersListTableProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
}

export const OrdersListTable: React.FC<OrdersListTableProps> = ({ orders, onOrderClick }) => {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <AlertCircle size={48} className="mb-4 opacity-50" />
        <p>Aucune commande pour le moment</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
            <th className="p-4 font-bold"># ID</th>
            <th className="p-4 font-bold">Type</th>
            <th className="p-4 font-bold">Client</th>
            <th className="p-4 font-bold w-1/3">Détail Commande</th>
            <th className="p-4 font-bold text-right">Total</th>
            <th className="p-4 font-bold text-center">Statut</th>
            <th className="p-4 font-bold"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
          {orders.map((order) => (
            <tr 
                key={order.id} 
                onClick={() => onOrderClick(order)}
                className="hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer transition-colors group"
            >
              <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                #{order.order_number}
              </td>
              
              <td className="p-4">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                    {order.order_type === 'delivery' ? <Bike size={16}/> : order.order_type === 'takeaway' ? <CheckCircle2 size={16}/> : <ChefHat size={16}/>}
                    <span className="capitalize">{order.order_type === 'takeaway' ? 'Emporté' : order.order_type === 'dine_in' ? 'Sur place' : 'Livraison'}</span>
                </div>
              </td>

              <td className="p-4">
                <div className="flex items-start gap-2">
                    {/* ✅ UTILISATION DE L'ICÔNE USER ICI */}
                    <div className="mt-0.5 text-slate-400"><User size={16} /></div>
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-800 dark:text-white">{order.customer_name || 'Passage'}</span>
                        <span className="text-xs text-slate-400">{order.customer_phone}</span>
                    </div>
                </div>
              </td>

              <td className="p-4">
                <div className="space-y-2">
                    {/* ✅ UTILISATION DU TYPE OrderItem ICI */}
                    {order.items?.slice(0, 3).map((item: OrderItem, idx: number) => (
                        <div key={idx} className="leading-tight">
                            <div className="flex items-baseline gap-2">
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {item.quantity}x {item.product_name}
                                </span>
                            </div>
                            {renderOrderItemDetails(item.options)}
                        </div>
                    ))}
                    {order.items && order.items.length > 3 && (
                        <span className="text-xs text-slate-400 italic">... et {order.items.length - 3} autres</span>
                    )}
                </div>
              </td>

              <td className="p-4 text-right font-black text-slate-900 dark:text-white text-base">
                {order.total_amount.toFixed(2)} <span className="text-[10px] font-normal text-slate-500">DH</span>
              </td>

              <td className="p-4 text-center">
                {getStatusBadge(order.status)}
                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-center gap-1">
                    <Clock size={10} />
                    {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </td>

              <td className="p-4 text-right text-slate-300 group-hover:text-primary transition-colors">
                <ChevronRight />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};