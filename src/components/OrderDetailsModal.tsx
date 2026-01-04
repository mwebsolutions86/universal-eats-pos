import * as React from 'react';
import { Order, OrderItem } from '../types';
import { X, Printer, User, Clock, CreditCard, ChefHat, Bike, CheckCircle2, MapPin, Banknote } from 'lucide-react';
import { getStatusBadge, renderOrderItemDetails } from './OrderUI';
import PaymentModal from './PaymentModal';

const { useState } = React;

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
  onUpdateStatus: (status: string) => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, onClose, onUpdateStatus }) => {
  const subtotal = order.total_amount || 0; 
  const [showPayment, setShowPayment] = useState(false);

  const handlePaymentConfirm = async (method: 'cash' | 'card', amountReceived: number) => {
      try {
          await window.electronAPI.db.payOrder(order.id, method, amountReceived);
          setShowPayment(false);
          onUpdateStatus('confirmed'); 
      } catch (e) {
          console.error("Erreur paiement", e);
      }
  };

  const getNextActions = () => {
    switch(order.status) {
      case 'pending': return [{ label: 'Confirmer', status: 'confirmed', color: 'bg-blue-600 text-white hover:bg-blue-700' }];
      case 'confirmed': return [{ label: 'Envoyer Cuisine', status: 'preparing', color: 'bg-orange-600 text-white hover:bg-orange-700' }];
      case 'preparing': return [{ label: 'Prêt', status: 'ready', color: 'bg-green-600 text-white hover:bg-green-700' }];
      case 'ready': 
        return order.order_type === 'delivery' 
          ? [{ label: 'Partir en Livraison', status: 'out_for_delivery', color: 'bg-purple-600 text-white hover:bg-purple-700' }]
          : [{ label: 'Terminer', status: 'delivered', color: 'bg-slate-800 text-white hover:bg-slate-900' }];
      case 'out_for_delivery': return [{ label: 'Livré', status: 'delivered', color: 'bg-slate-800 text-white hover:bg-slate-900' }];
      default: return [];
    }
  };

  // ✅ CORRECTION : Remplacement de 'paid' (inexistant dans l'enum DB) par 'collected'
  const isPaid = order.payment_status === 'collected';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
              <span className="font-mono font-black text-xl text-gray-800 dark:text-white">#{order.order_number}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Commande</span>
              <div className="flex items-center gap-2">
                {getStatusBadge(order.status)}
                {/* ✅ CORRECTION : Date safe */}
                <span className="text-xs text-gray-400">• {new Date(order.created_at || Date.now()).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Imprimer">
              <Printer size={20} />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-950">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 font-medium">
                      <tr>
                        <th className="px-4 py-3">Produit</th>
                        <th className="px-4 py-3 text-center">Qté</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                      {order.items?.map((item: OrderItem, idx: number) => (
                          <tr key={idx}>
                            <td className="px-4 py-3">
                              <span className="font-bold text-gray-800 dark:text-white text-base">{item.product_name}</span>
                              {/* ✅ CORRECTION : Cast explicit */}
                              {renderOrderItemDetails(item.options as any)}
                            </td>
                            <td className="px-4 py-3 text-center font-medium bg-white/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300">
                                {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                                {(item.total_price || 0).toFixed(2)}
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
              </div>
              <div className="flex justify-end">
                <div className="w-64 bg-gray-50 dark:bg-slate-900 rounded-xl p-4 space-y-2 border border-gray-100 dark:border-slate-800">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-slate-400">
                    <span>Sous-total</span>
                    <span>{subtotal.toFixed(2)} DH</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="font-bold text-gray-900 dark:text-white">Total à payer</span>
                    <span className="font-black text-xl text-blue-600">{subtotal.toFixed(2)} <span className="text-xs">DH</span></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                  <User size={14} /> Client
                </h3>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
                    {(order.customer_name || 'A')[0]}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{order.customer_name || 'Client de passage'}</p>
                    <p className="text-sm text-gray-500">{order.customer_phone || 'Pas de téléphone'}</p>
                  </div>
                </div>
                {order.order_type === 'delivery' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300 flex gap-2 items-start">
                    <MapPin size={16} className="shrink-0 mt-0.5" />
                    <span className="font-medium">{order.delivery_address || 'Adresse non renseignée'}</span>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                    <CreditCard size={14} /> Paiement
                  </h3>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold uppercase bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">
                      {order.payment_method || 'Espèces'}
                    </span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {isPaid ? 'PAYÉ' : 'EN ATTENTE'}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                   <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                    <Clock size={14} /> Type
                  </h3>
                  <div className="w-full bg-gray-50 dark:bg-slate-800 rounded-lg p-2 text-center font-bold text-gray-700 dark:text-white border border-gray-200 dark:border-slate-700 flex items-center justify-center gap-2">
                    {order.order_type === 'delivery' ? <Bike size={16}/> : order.order_type === 'takeaway' ? <CheckCircle2 size={16}/> : <ChefHat size={16}/>}
                    {order.order_type === 'delivery' ? 'LIVRAISON' : order.order_type === 'takeaway' ? 'À EMPORTER' : 'SUR PLACE'}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex justify-between items-center">
          <div className="flex items-center gap-4">
               {!isPaid && order.status !== 'cancelled' && (
                  <button 
                    onClick={() => setShowPayment(true)}
                    className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Banknote size={20} />
                    ENCAISSER
                  </button>
               )}
               {order.status !== 'cancelled' && order.status !== 'delivered' && (
                    <button onClick={() => onUpdateStatus('cancelled')} className="px-4 py-2 text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm">
                        Annuler
                    </button>
               )}
          </div>
          <div className="flex gap-3">
            {getNextActions().map((action, i) => (
              <button
                key={i}
                onClick={() => onUpdateStatus(action.status)}
                className={`px-6 py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-all ${action.color}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showPayment && (
          <PaymentModal 
             total={subtotal}
             onClose={() => setShowPayment(false)}
             onConfirm={handlePaymentConfirm}
          />
      )}
    </div>
  );
};

export default OrderDetailsModal;