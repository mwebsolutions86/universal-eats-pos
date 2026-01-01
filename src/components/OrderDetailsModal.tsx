import * as React from 'react';
import { Order, OrderItem } from '../types';
import { X, Printer, MapPin, User, Clock, CreditCard, ChefHat, Bike, CheckCircle2 } from 'lucide-react';
import { getStatusBadge } from './OrderUI';

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
  onUpdateStatus: (status: string) => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, onClose, onUpdateStatus }) => {
  // Calculs simples
  const subtotal = order.total_amount; 
  
  const getNextActions = () => {
    switch(order.status) {
      case 'pending': return [{ label: 'Valider & Cuisine', status: 'preparing', color: 'bg-blue-600 hover:bg-blue-700' }];
      case 'confirmed': return [{ label: 'Lancer Cuisine', status: 'preparing', color: 'bg-orange-600 hover:bg-orange-700' }];
      case 'preparing': return [{ label: 'Commande Prête', status: 'ready', color: 'bg-green-600 hover:bg-green-700' }];
      case 'ready': 
        return order.order_type === 'delivery' 
          ? [{ label: 'Partir en Livraison', status: 'out_for_delivery', color: 'bg-purple-600 hover:bg-purple-700' }]
          : [{ label: 'Remettre au Client', status: 'delivered', color: 'bg-gray-800 hover:bg-gray-900' }];
      case 'out_for_delivery': return [{ label: 'Confirmer Livraison', status: 'delivered', color: 'bg-gray-800 hover:bg-gray-900' }];
      default: return [];
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
              <span className="font-mono font-black text-xl text-gray-800">#{order.order_number}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Commande</span>
              <div className="flex items-center gap-2">
                {getStatusBadge(order.status)}
                <span className="text-xs text-gray-400">• {new Date(order.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors" title="Imprimer">
              <Printer size={20} />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-red-50 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLONNE GAUCHE : ITEMS */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <ChefHat size={16} /> Détails de la commande
                </h3>
                <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-500 font-medium">
                      <tr>
                        <th className="px-4 py-3">Produit</th>
                        <th className="px-4 py-3 text-center">Qté</th>
                        <th className="px-4 py-3 text-right">Prix</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {order.items?.map((item: OrderItem, idx: number) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const opts = item.options as any;
                        return (
                          <tr key={idx}>
                            <td className="px-4 py-3">
                              <span className="font-bold text-gray-800">{item.product_name}</span>
                              {opts?.variation && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  + {opts.variation.name}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center font-medium bg-white/50">{item.quantity}</td>
                            <td className="px-4 py-3 text-right text-gray-500">{item.unit_price.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900">{item.total_price.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Résumé Financier */}
              <div className="flex justify-end">
                <div className="w-64 bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Sous-total</span>
                    <span>{subtotal.toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Livraison</span>
                    <span>0.00 DH</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                    <span className="font-bold text-gray-900">Total à payer</span>
                    <span className="font-black text-xl text-blue-600">{order.total_amount.toFixed(2)} <span className="text-xs">DH</span></span>
                  </div>
                </div>
              </div>
            </div>

            {/* COLONNE DROITE : CLIENT & INFO */}
            <div className="space-y-6">
              
              {/* Carte Client */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                  <User size={14} /> Client
                </h3>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                    {(order.customer_name || 'A')[0]}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{order.customer_name || 'Client de passage'}</p>
                    <p className="text-sm text-gray-500">{order.customer_phone || 'Pas de téléphone'}</p>
                  </div>
                </div>
                
                {order.order_type === 'delivery' && (
                  <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800 flex gap-2 items-start">
                    <MapPin size={16} className="shrink-0 mt-0.5" />
                    <span className="font-medium">{order.delivery_address || 'Adresse non renseignée'}</span>
                  </div>
                )}
              </div>

              {/* Info Paiement & Type */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                    <CreditCard size={14} /> Paiement
                  </h3>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Méthode</span>
                    <span className="text-sm font-bold uppercase bg-gray-100 px-2 py-1 rounded">
                      {order.payment_method || 'Espèces'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-medium text-gray-700">Statut</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {order.payment_status === 'paid' ? 'PAYÉ' : 'EN ATTENTE'}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                   <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                    <Clock size={14} /> Type
                  </h3>
                  <div className="w-full bg-gray-50 rounded-lg p-2 text-center font-bold text-gray-700 border border-gray-200 flex items-center justify-center gap-2">
                    {order.order_type === 'delivery' ? <Bike size={16}/> : order.order_type === 'takeaway' ? <CheckCircle2 size={16}/> : <ChefHat size={16}/>}
                    {order.order_type === 'delivery' ? 'LIVRAISON' : order.order_type === 'takeaway' ? 'À EMPORTER' : 'SUR PLACE'}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <button onClick={() => onUpdateStatus('cancelled')} className="px-4 py-2 text-red-600 font-bold hover:bg-red-50 rounded-lg transition-colors text-sm">
            Annuler la commande
          </button>
          
          <div className="flex gap-3">
            {getNextActions().map((action, i) => (
              <button
                key={i}
                onClick={() => onUpdateStatus(action.status)}
                className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-all ${action.color}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default OrderDetailsModal;