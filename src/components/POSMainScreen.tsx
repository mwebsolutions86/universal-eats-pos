import React, { useState, useEffect } from 'react';
import { StaffMember, Category, Product } from '../types';

interface POSMainScreenProps {
  user: StaffMember;
  onLogout: () => void;
}

const POSMainScreen: React.FC<POSMainScreenProps> = ({ user, onLogout }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Panier (Simple pour l'instant)
  const [cart, setCart] = useState<{product: Product, qty: number}[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadProducts(selectedCategory);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    const cats = await window.electronAPI.db.getCategories();
    setCategories(cats);
    if (cats.length > 0) setSelectedCategory(cats[0].id);
  };

  const loadProducts = async (catId: string) => {
    const prods = await window.electronAPI.db.getProductsByCategory(catId);
    setProducts(prods);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900 overflow-hidden">
      
      {/* 1. SIDEBAR CATÉGORIES (Gauche) */}
      <div className="w-24 bg-white border-r border-gray-200 flex flex-col items-center py-4 overflow-y-auto hide-scrollbar">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`w-20 h-20 mb-3 rounded-xl flex flex-col items-center justify-center p-1 transition-all ${
              selectedCategory === cat.id 
                ? 'bg-orange-500 text-white shadow-lg scale-105' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
             {/* Fallback si pas d'image */}
            <span className="text-xs font-bold text-center leading-tight line-clamp-2">
              {cat.name}
            </span>
          </button>
        ))}
      </div>

      {/* 2. GRILLE PRODUITS (Centre) */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h2 className="text-xl font-bold text-gray-800">
            {categories.find(c => c.id === selectedCategory)?.name || 'Menu'}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-500">Caissier: {user.full_name}</span>
            <button 
              onClick={onLogout}
              className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-200"
            >
              Fermer
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-orange-500 hover:shadow-md transition-all flex flex-col items-start text-left h-40 justify-between active:scale-95"
              >
                <div>
                  <h3 className="font-bold text-gray-800 line-clamp-2">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{product.description}</p>
                  )}
                </div>
                <span className="font-mono font-bold text-lg text-orange-600">
                  {product.price.toFixed(2)}€
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. PANIER (Droite) */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full shadow-xl z-10">
        <div className="h-16 flex items-center justify-center border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-lg text-gray-700">Commande en cours</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
              <span className="text-4xl mb-2">🛒</span>
              <p>Panier vide</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-sm">
                    {item.qty}x
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-800">{item.product.name}</span>
                    <span className="text-xs text-gray-500">{(item.product.price * item.qty).toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totaux & Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-center mb-4 text-xl font-bold text-gray-900">
            <span>Total</span>
            <span>{cartTotal.toFixed(2)} €</span>
          </div>

          <button 
            disabled={cart.length === 0}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            ENCAISSER
          </button>
        </div>
      </div>

    </div>
  );
};

export default POSMainScreen;