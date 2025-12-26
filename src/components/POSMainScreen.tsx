import * as React from 'react';
import { StaffMember, Category, Product, ProductVariation, Order, Customer, OrderType } from '../types';
import ProductDetailsModal from './ProductDetailsModal';
import LiveOrdersTab from './LiveOrdersTab';
import CustomerModal from './CustomerModal';

const { useState, useEffect } = React;

interface POSMainScreenProps {
  user: StaffMember;
  onLogout: () => void;
}

// Typage précis pour le panier
interface CartItem {
  product: Product;
  variation?: ProductVariation;
  qty: number;
}

const POSMainScreen: React.FC<POSMainScreenProps> = ({ user, onLogout }) => {
  // --- ÉTATS ---
  const [activeTab, setActiveTab] = useState<'pos' | 'live-orders' | 'history'>('pos');
  
  // Données Catalogue
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Données Panier & Commande
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);

  // Modales
  const [productToConfigure, setProductToConfigure] = useState<Product | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [liveOrders, setLiveOrders] = useState<Order[]>([]);

  // --- CHARGEMENT ---
  useEffect(() => {
    loadInitialData();
    // Simulation chargement commandes live
    loadLiveOrders();
  }, []);

  useEffect(() => {
    if (selectedCategory) loadProducts(selectedCategory);
  }, [selectedCategory]);

  const loadInitialData = async () => {
    try {
      const cats = await window.electronAPI.db.getCategories();
      setCategories(cats);
      if (cats.length > 0) setSelectedCategory(cats[0].id);
    } catch (e) {
      console.error("Erreur chargement catégories:", e);
    }
  };

  const loadProducts = async (catId: string) => {
    const prods = await window.electronAPI.db.getProductsByCategory(catId);
    setProducts(prods);
  };

  const loadLiveOrders = async () => {
    const orders = await window.electronAPI.db.getLiveOrders();
    setLiveOrders(orders);
  };

  // --- LOGIQUE MÉTIER ---

  const handleOrderTypeChange = (type: OrderType) => {
    setOrderType(type);
    // Règle métier : Si Livraison ou Tel, on force la saisie client
    if ((type === 'delivery' || type === 'phone') && !currentCustomer) {
      setShowCustomerModal(true);
    }
  };

  const handleProductClick = (product: Product) => {
    // Si produit variable (prix 0 ou type variable), on ouvre la config
    if (product.price === 0 || product.type === 'variable') {
      setProductToConfigure(product);
    } else {
      addToCart(product);
    }
  };

  const addToCart = (product: Product, variation?: ProductVariation) => {
    setCart(prev => {
      // Clé unique : ID Produit + ID Variation (si existe)
      const itemId = variation ? `${product.id}-${variation.id}` : product.id;
      
      const existingIndex = prev.findIndex(item => {
        const currentItemId = item.variation ? `${item.product.id}-${item.variation.id}` : item.product.id;
        return currentItemId === itemId;
      });

      if (existingIndex >= 0) {
        const newCart = [...prev];
        newCart[existingIndex].qty += 1;
        return newCart;
      }
      return [...prev, { product, variation, qty: 1 }];
    });
    setProductToConfigure(null);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((sum, item) => {
    const price = item.variation ? item.variation.price : item.product.price;
    return sum + (price * item.qty);
  }, 0);

  // --- RENDU ---

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans">
      
      {/* 1. NAVIGATION (Noir) */}
      <div className="w-20 bg-gray-900 flex flex-col items-center py-6 gap-6 shrink-0 z-50 text-white shadow-xl">
        <div className="mb-4">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center font-bold text-xl">
            UE
          </div>
        </div>
        
        <NavButton icon="⚡" label="Caisse" active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} />
        <NavButton icon="🛵" label="Live" active={activeTab === 'live-orders'} onClick={() => setActiveTab('live-orders')} badge={liveOrders.length} />
        <NavButton icon="📊" label="Stats" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />

        <div className="mt-auto">
          <button onClick={onLogout} className="w-10 h-10 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">
            ⏻
          </button>
        </div>
      </div>

      {activeTab === 'pos' ? (
        <>
          {/* 2. CATEGORIES (Blanc) */}
          <div className="w-32 bg-white border-r border-gray-200 flex flex-col items-center py-2 overflow-y-auto hide-scrollbar shrink-0 z-20">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-28 mb-3 rounded-xl flex flex-col items-center justify-center p-2 transition-all duration-200 group ${
                  selectedCategory === cat.id 
                    ? 'bg-orange-50 ring-2 ring-orange-500 shadow-md' 
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className={`w-16 h-16 rounded-full mb-2 flex items-center justify-center text-2xl overflow-hidden bg-white border border-gray-100 shadow-sm`}>
                  {cat.image_url ? (
                    <img 
                      src={cat.image_url} 
                      alt={cat.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100?text=IMG'; }}
                    />
                  ) : (
                    <span>🍔</span> 
                  )}
                </div>
                <span className={`text-[11px] font-bold text-center leading-tight line-clamp-2 uppercase ${
                  selectedCategory === cat.id ? 'text-orange-700' : 'text-gray-500'
                }`}>
                  {cat.name}
                </span>
              </button>
            ))}
          </div>

          {/* 3. GRILLE PRODUITS (Gris) */}
          <div className="flex-1 flex flex-col h-full min-w-0 bg-gray-100 relative">
            
            {/* Header POS */}
            <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm z-10">
              
              {/* Sélecteur de Mode */}
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <OrderModeButton active={orderType === 'dine_in'} label="Sur Place" icon="🍽️" onClick={() => handleOrderTypeChange('dine_in')} />
                <OrderModeButton active={orderType === 'takeaway'} label="Emporté" icon="🛍️" onClick={() => handleOrderTypeChange('takeaway')} />
                <OrderModeButton active={orderType === 'delivery'} label="Livraison" icon="🛵" onClick={() => handleOrderTypeChange('delivery')} />
                <OrderModeButton active={orderType === 'phone'} label="Tel" icon="📞" onClick={() => handleOrderTypeChange('phone')} />
              </div>

              {/* Client Actif */}
              <button 
                onClick={() => setShowCustomerModal(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                  currentCustomer ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">👤</span>
                {currentCustomer ? (
                  <div className="flex flex-col items-start leading-none">
                    <span className="font-bold text-xs">{currentCustomer.full_name}</span>
                    <span className="text-[10px] opacity-70">{currentCustomer.phone}</span>
                  </div>
                ) : (
                  <span className="text-xs font-bold">CLIENT ?</span>
                )}
              </button>

              {/* Info Staff */}
              <div className="flex items-center gap-2">
                 <div className="text-right hidden xl:block">
                    <div className="text-xs font-bold text-gray-900">{user.full_name}</div>
                    <div className="text-[10px] text-gray-400 uppercase">{user.role || 'Caissier'}</div>
                 </div>
                 <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                    {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-orange-500" />}
                 </div>
              </div>
            </div>

            {/* Grille */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 content-start pb-20">
                {products.map(product => (
                  <ProductCard key={product.id} product={product} onClick={() => handleProductClick(product)} />
                ))}
              </div>
            </div>
          </div>

          {/* 4. PANIER (Droite) */}
          <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full shadow-2xl z-30 shrink-0">
            <CartPanel 
              cart={cart} 
              total={cartTotal} 
              orderType={orderType}
              onRemove={removeFromCart} 
            />
          </div>
        </>
      ) : activeTab === 'live-orders' ? (
        <LiveOrdersTab orders={liveOrders} onProcessOrder={(o) => console.log("Process", o)} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 font-bold">
          🚧 Module Stats & Clôture en construction
        </div>
      )}

      {/* MODALES */}
      {productToConfigure && (
        <ProductDetailsModal 
          product={productToConfigure} 
          onClose={() => setProductToConfigure(null)}
          onAddToCart={addToCart}
        />
      )}
      
      {showCustomerModal && (
        <CustomerModal 
          onClose={() => setShowCustomerModal(false)}
          onSelectCustomer={(c) => {
            setCurrentCustomer(c);
            setShowCustomerModal(false);
          }}
        />
      )}

    </div>
  );
};

// --- SOUS-COMPOSANTS TYPÉS ---

// 1. Types pour OrderModeButton
interface OrderModeButtonProps {
  active: boolean;
  label: string;
  icon: string;
  onClick: () => void;
}

const OrderModeButton: React.FC<OrderModeButtonProps> = ({ active, label, icon, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-all ${
      active ? 'bg-white text-orange-600 shadow-sm scale-105' : 'text-gray-500 hover:text-gray-900'
    }`}
  >
    <span>{icon}</span>
    <span className="hidden xl:inline">{label}</span>
  </button>
);

// 2. Types pour NavButton
interface NavButtonProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, label, active, onClick, badge }) => (
  <button 
    onClick={onClick}
    className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all relative ${
      active ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
    }`}
  >
    <span className="text-2xl mb-0.5">{icon}</span>
    <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-gray-900 font-bold">
        {badge}
      </span>
    )}
  </button>
);

// 3. ProductCard (Déjà typé, mais inclus pour la cohérence)
interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => (
  <button
    onClick={onClick}
    className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:border-orange-500 hover:shadow-lg transition-all flex flex-col h-40 overflow-hidden text-left relative active:scale-[0.96]"
  >
    <div className="h-24 bg-gray-100 w-full relative overflow-hidden">
      {product.image_url ? (
        <img 
          src={product.image_url} 
          alt="" 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/300?text=Food'; }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">🍽️</div>
      )}
      
      {(product.price === 0 || product.type === 'variable') && (
        <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold backdrop-blur-md">
          OPTIONS
        </div>
      )}
    </div>
    
    <div className="p-2 flex flex-col justify-between flex-1">
      <h3 className="font-bold text-gray-800 text-xs leading-tight line-clamp-2 group-hover:text-orange-600">
        {product.name}
      </h3>
      <div className="flex justify-between items-end mt-1">
        <span className="text-sm font-black text-gray-900">
          {product.price > 0 ? product.price.toFixed(0) : ""} <span className="text-[10px] font-normal text-gray-500">DH</span>
        </span>
      </div>
    </div>
  </button>
);

// 4. Types pour CartPanel
interface CartPanelProps {
  cart: CartItem[];
  total: number;
  orderType: OrderType;
  onRemove: (index: number) => void;
}

const CartPanel: React.FC<CartPanelProps> = ({ cart, total, orderType, onRemove }) => (
  <>
    <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100 bg-white">
      <h3 className="font-bold text-lg text-gray-800">Panier</h3>
      <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${
        orderType === 'delivery' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
      }`}>
        {orderType === 'dine_in' ? 'Sur Place' : orderType === 'takeaway' ? 'Emporté' : orderType}
      </span>
    </div>

    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/50">
      {cart.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
          <span className="text-5xl mb-4">🛒</span>
          <p className="font-medium text-sm">Votre panier est vide</p>
        </div>
      ) : (
        cart.map((item, idx) => (
          <div key={idx} className="flex justify-between items-start bg-white p-3 rounded-xl border border-gray-100 shadow-sm relative group animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-gray-900 text-white rounded-md flex items-center justify-center font-bold text-xs mt-0.5 shadow-sm">
                {item.qty}
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm leading-tight">{item.product.name}</p>
                {item.variation && (
                  <p className="text-xs text-gray-500 font-medium">+ {item.variation.name}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-sm text-gray-900">
                {((item.variation ? item.variation.price : item.product.price) * item.qty).toFixed(2)}
              </p>
              <button 
                onClick={() => onRemove(idx)}
                className="text-[10px] text-red-500 font-bold hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
              >
                SUPPRIMER
              </button>
            </div>
          </div>
        ))
      )}
    </div>

    <div className="p-5 bg-white border-t border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <span className="text-gray-500 text-sm font-medium">Total à payer</span>
        <span className="text-4xl font-black text-gray-900 tracking-tight">{total.toFixed(2)} <span className="text-lg text-gray-400 font-bold">DH</span></span>
      </div>
      <button 
        disabled={cart.length === 0}
        className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-lg shadow-xl shadow-gray-200 hover:bg-orange-600 hover:shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all flex justify-between px-6 items-center"
      >
        <span>ENCAISSER</span>
        <span>→</span>
      </button>
    </div>
  </>
);

export default POSMainScreen;