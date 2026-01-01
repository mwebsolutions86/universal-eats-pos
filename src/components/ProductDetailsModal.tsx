import * as React from 'react';
import { Product, ProductVariation } from '../types'; // CartItem retiré
import { X, Minus, Plus, ShoppingCart } from 'lucide-react';

const { useState, useEffect } = React;

interface ProductDetailsModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, variation?: ProductVariation, qty?: number) => void;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ product, onClose, onAddToCart }) => {
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVars = async () => {
      try {
        const vars = await window.electronAPI.db.getProductVariations(product.id);
        setVariations(vars);
        if (vars.length > 0) setSelectedVariation(vars[0]);
      } catch (e) {
        console.error("Erreur chargement variations", e);
      } finally {
        setLoading(false);
      }
    };
    loadVars();
  }, [product]);

  const currentPrice = selectedVariation ? selectedVariation.price : product.price;
  const totalPrice = currentPrice * qty;

  const handleConfirm = () => {
    onAddToCart(product, selectedVariation || undefined, qty);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row h-[500px]">
        
        <div className="w-full md:w-1/2 bg-gray-100 relative">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">🍔</div>
          )}
          <button onClick={onClose} className="absolute top-4 left-4 bg-white/90 p-2 rounded-full text-gray-800 hover:bg-white md:hidden">
            <X size={20}/>
          </button>
        </div>

        <div className="w-full md:w-1/2 flex flex-col bg-white">
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="flex justify-between items-start mb-2">
               <h2 className="text-2xl font-black text-gray-900 leading-tight">{product.name}</h2>
               <button onClick={onClose} className="hidden md:block text-gray-400 hover:text-gray-600">
                 <X size={24}/>
               </button>
            </div>
            
            <p className="text-gray-500 text-sm mb-6">{product.description || "Délicieux et préparé à la commande."}</p>

            {loading ? (
                <div className="text-center py-4 text-gray-400">Chargement des options...</div>
            ) : variations.length > 0 ? (
                <div className="mb-6">
                    <h3 className="font-bold text-sm text-gray-900 uppercase mb-3 tracking-wide">Choisissez une option</h3>
                    <div className="space-y-2">
                        {variations.map(v => (
                            <label key={v.id} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedVariation?.id === v.id ? 'border-orange-500 bg-orange-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedVariation?.id === v.id ? 'border-orange-500' : 'border-gray-300'}`}>
                                        {selectedVariation?.id === v.id && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                                    </div>
                                    <span className={`font-medium ${selectedVariation?.id === v.id ? 'text-orange-900' : 'text-gray-700'}`}>{v.name}</span>
                                </div>
                                <span className="font-bold text-gray-900">{v.price.toFixed(2)} DH</span>
                            </label>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="mb-6 p-4 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium">
                    Aucune option supplémentaire.
                </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center bg-white border border-gray-200 rounded-xl">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-l-xl"><Minus size={16}/></button>
                  <span className="w-10 text-center font-bold text-lg">{qty}</span>
                  <button onClick={() => setQty(qty + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-r-xl"><Plus size={16}/></button>
               </div>
               <div className="text-right">
                  <p className="text-xs text-gray-500 font-medium">Total prix</p>
                  <p className="text-2xl font-black text-gray-900">{totalPrice.toFixed(2)} DH</p>
               </div>
            </div>
            
            <button 
                onClick={handleConfirm}
                className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-gray-900/10 active:scale-95"
            >
                <ShoppingCart size={20} />
                AJOUTER AU PANIER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsModal;