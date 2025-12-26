import React, { useEffect, useState } from 'react';
import { Product, ProductVariation } from '../types';

interface ProductDetailsModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, variation?: ProductVariation) => void;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ product, onClose, onAddToCart }) => {
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVariations();
  }, [product]);

  const loadVariations = async () => {
    const vars = await window.electronAPI.db.getProductVariations(product.id);
    setVariations(vars);
    // Pré-sélectionner la première option pour aller vite
    if (vars.length > 0) setSelectedVariation(vars[0]);
    setLoading(false);
  };

  const handleConfirm = () => {
    if (selectedVariation) {
      onAddToCart(product, selectedVariation);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Image */}
        <div className="h-48 bg-gray-100 relative">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
              <span className="text-4xl">🍔</span>
            </div>
          )}
          <button onClick={onClose} className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 hover:bg-black/70">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{product.name}</h2>
          <p className="text-gray-500 text-sm mb-6">{product.description || "Sélectionnez vos options"}</p>

          <div className="space-y-3">
            <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider">Choisissez une taille / option</h3>
            {loading ? (
              <p>Chargement...</p>
            ) : variations.length === 0 ? (
              <p className="text-red-500">Aucune variation disponible.</p>
            ) : (
              variations.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariation(v)}
                  className={`w-full flex justify-between items-center p-4 rounded-xl border-2 transition-all ${
                    selectedVariation?.id === v.id
                      ? 'border-orange-500 bg-orange-50 text-orange-900'
                      : 'border-gray-100 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <span className="font-bold">{v.name}</span>
                  <span className="font-mono font-bold">{v.price.toFixed(2)} DH</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleConfirm}
            disabled={!selectedVariation}
            className="w-full py-4 bg-orange-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          >
            AJOUTER • {selectedVariation ? selectedVariation.price.toFixed(2) : 0} DH
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsModal;