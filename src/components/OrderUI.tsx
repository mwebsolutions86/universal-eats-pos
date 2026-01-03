import * as React from 'react';
import { Order, OrderItem } from '../types';
import { Clock, User, CheckCircle2, Bike, ChefHat, Grid, List, AlertCircle } from 'lucide-react';

// Interfaces locales pour typer le parsing JSON
interface OptionDetails {
    name: string;
    price: number;
}
interface VariationDetails {
    name: string;
}
interface ParsedOptions {
    variation?: VariationDetails;
    options?: OptionDetails[];
    removed_ingredients?: string[];
    note?: string;
    comment?: string;
}

// CORRECTION 1: Typage de l'entrée (string, objet ou null)
export const renderOrderItemDetails = (options: string | Record<string, unknown> | null | undefined) => {
  if (!options) return null;
  
  let parsedOpts: ParsedOptions | OptionDetails[] = {};
  
  if (typeof options === 'string') { 
      try { 
          parsedOpts = JSON.parse(options); 
      } catch (e) { return null; } 
  } else {
      parsedOpts = options as ParsedOptions | OptionDetails[];
  }

  if (!parsedOpts) return null;

  // CORRECTION 2: itemsRender est un tableau de ReactNodes
  const itemsRender: React.ReactNode[] = [];

  // On vérifie si parsedOpts est un tableau (vieux format parfois) ou un objet
  const isArray = Array.isArray(parsedOpts);
  const optsObj = !isArray ? (parsedOpts as ParsedOptions) : null;

  // A. Variation
  if (optsObj?.variation) {
      itemsRender.push(<span key="var" className="block text-xs font-black text-black dark:text-white uppercase tracking-wide mt-0.5">📏 {optsObj.variation.name}</span>);
  }

  // B. Options
  // Si c'est un tableau, c'est direct les options. Sinon c'est dans .options
  const supps = isArray ? (parsedOpts as OptionDetails[]) : (optsObj?.options || []);
  
  if (Array.isArray(supps) && supps.length > 0) {
      // CORRECTION 3: Typage explicite de 'opt'
      supps.forEach((opt: OptionDetails, i: number) => {
          itemsRender.push(<span key={`opt-${i}`} className="block text-[11px] text-slate-600 dark:text-slate-300 ml-1">+ {opt.name} {opt.price > 0 && <span className="font-bold">({Number(opt.price).toFixed(0)} DH)</span>}</span>);
      });
  }

  // C. Exclusions
  const removed = optsObj?.removed_ingredients || [];
  if (Array.isArray(removed) && removed.length > 0) {
      removed.forEach((ing: string, i: number) => {
          itemsRender.push(<span key={`rem-${i}`} className="block text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-1 rounded mt-0.5 w-fit border border-red-100">⛔ Sans {ing}</span>);
      });
  }

  // D. Note
  const note = optsObj?.note || optsObj?.comment;
  if (note && typeof note === 'string' && note.trim() !== '') {
      itemsRender.push(<span key="note" className="block text-[10px] font-bold text-orange-700 bg-orange-50 dark:bg-orange-900/20 px-1 py-0.5 rounded mt-1 border border-orange-200 dark:border-orange-800 w-fit">📝 {note}</span>);
  }

  return itemsRender.length > 0 ? <div className="mt-1 pl-1 border-l-2 border-slate-200 dark:border-slate-700">{itemsRender}</div> : null;
};

export const getStatusBadge = (status: string | null | undefined) => {
  const safeStatus = status || 'pending';
  const styles: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-800 border-yellow-200', confirmed: 'bg-blue-100 text-blue-800 border-blue-200', preparing: 'bg-orange-100 text-orange-800 border-orange-200', ready: 'bg-green-100 text-green-800 border-green-200', delivered: 'bg-slate-100 text-slate-800 border-slate-200', cancelled: 'bg-red-100 text-red-800 border-red-200', out_for_delivery: 'bg-purple-100 text-purple-800 border-purple-200' };
  const labels: Record<string, string> = { pending: 'En attente', confirmed: 'Confirmée', preparing: 'En cuisine', ready: 'Prête', delivered: 'Livrée', cancelled: 'Annulée', out_for_delivery: 'En livraison' };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[safeStatus] || 'bg-gray-100 text-gray-800'}`}>{labels[safeStatus] || safeStatus}</span>;
};

interface ViewSwitcherProps { currentView: 'list' | 'grid' | 'kanban'; onViewChange: (view: 'list' | 'grid' | 'kanban') => void; }
export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ currentView, onViewChange }) => {
    return (
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button onClick={() => onViewChange('list')} className={`p-2 rounded-md transition-all ${currentView === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}><List size={18} /></button>
            <button onClick={() => onViewChange('grid')} className={`p-2 rounded-md transition-all ${currentView === 'grid' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}><Grid size={18} /></button>
        </div>
    );
};

interface OrderCardProps { order: Order; onClick: (order: Order) => void; }
export const OrderCard: React.FC<OrderCardProps> = ({ order, onClick }) => {
    const timeDisplay = order.created_at ? new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--';
    return (
        <div onClick={() => onClick(order)} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer flex flex-col h-auto min-h-[140px]">
            <div className="flex justify-between items-start mb-2"><div><span className="font-mono font-black text-base text-slate-800 dark:text-white">#{order.order_number}</span><div className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={10} />{timeDisplay}</div></div>{getStatusBadge(order.status)}</div>
            <div className="flex-1 mb-2">
                <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-slate-700 dark:text-slate-300"><User size={12} className="text-slate-400"/><span className="truncate max-w-[150px]">{order.customer_name || 'Client Passager'}</span></div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-2 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded w-fit">{order.order_type === 'delivery' ? <Bike size={12}/> : order.order_type === 'takeaway' ? <CheckCircle2 size={12}/> : <ChefHat size={12}/>}<span className="uppercase font-bold">{order.order_type === 'takeaway' ? 'Emporté' : order.order_type === 'dine_in' ? 'Sur Place' : 'Livraison'}</span></div>
                <div className="space-y-1.5">
                    {order.items?.slice(0, 3).map((item: OrderItem, idx: number) => (<div key={idx} className="flex flex-col text-xs leading-tight"><span className="font-bold text-slate-700 dark:text-slate-200">{item.quantity}x {item.product_name}</span>{renderOrderItemDetails(item.options as Record<string, unknown>)}</div>))}
                    {order.items && order.items.length > 3 && (<span className="text-[10px] text-slate-400 italic block mt-1">+ {order.items.length - 3} autres...</span>)}
                </div>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center mt-auto"><span className="text-[10px] text-slate-400 font-medium uppercase">Total</span><span className="font-black text-base text-slate-900 dark:text-white">{(order.total_amount || 0).toFixed(2)} <span className="text-[10px] font-normal">DH</span></span></div>
        </div>
    );
};

interface OrdersListTableProps { orders: Order[]; onOrderClick: (order: Order) => void; }
export const OrdersListTable: React.FC<OrdersListTableProps> = ({ orders, onOrderClick }) => {
  if (orders.length === 0) { return <div className="flex flex-col items-center justify-center h-64 text-slate-400"><AlertCircle size={48} className="mb-4 opacity-50" /><p>Aucune commande pour le moment</p></div>; }
  return (
    <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
      <table className="w-full text-left border-collapse">
        <thead><tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800"><th className="p-4 font-bold">#</th><th className="p-4 font-bold">Type</th><th className="p-4 font-bold">Client</th><th className="p-4 font-bold w-1/3">Détail Commande</th><th className="p-4 font-bold text-right">Total</th><th className="p-4 font-bold text-center">Statut</th></tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
          {orders.map((order) => (
            <tr key={order.id} onClick={() => onOrderClick(order)} className="hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer transition-colors group">
              <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">#{order.order_number}</td>
              <td className="p-4"><div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">{order.order_type === 'delivery' ? <Bike size={16}/> : order.order_type === 'takeaway' ? <CheckCircle2 size={16}/> : <ChefHat size={16}/>}<span className="capitalize">{order.order_type === 'takeaway' ? 'Emporté' : order.order_type === 'dine_in' ? 'Sur place' : 'Livraison'}</span></div></td>
              <td className="p-4"><div className="flex items-start gap-2"><div className="mt-0.5 text-slate-400"><User size={16} /></div><div className="flex flex-col"><span className="font-bold text-slate-800 dark:text-white">{order.customer_name || 'Passage'}</span><span className="text-xs text-slate-400">{order.customer_phone || ''}</span></div></div></td>
              <td className="p-4"><div className="space-y-2">{order.items?.slice(0, 3).map((item: OrderItem, idx: number) => (<div key={idx} className="leading-tight"><div className="flex items-baseline gap-2"><span className="font-bold text-slate-800 dark:text-slate-200">{item.quantity}x {item.product_name}</span></div>{renderOrderItemDetails(item.options as Record<string, unknown>)}</div>))}{order.items && order.items.length > 3 && (<span className="text-xs text-slate-400 italic">... et {order.items.length - 3} autres</span>)}</div></td>
              <td className="p-4 text-right font-black text-slate-900 dark:text-white text-base">{(order.total_amount || 0).toFixed(2)} <span className="text-[10px] font-normal text-slate-500">DH</span></td>
              <td className="p-4 text-center">{getStatusBadge(order.status)}<div className="text-[10px] text-slate-400 mt-1 flex items-center justify-center gap-1"><Clock size={10} />{order.created_at ? new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};