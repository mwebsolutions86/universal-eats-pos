import * as React from 'react';
import { StaffMember, Category, Product, ProductVariation, OrderType, POSSession, CartItem, Customer, OptionItem } from '../types';
import ProductDetailsModal from './ProductDetailsModal';
import CustomerModal from './CustomerModal';
import PaymentModal from './PaymentModal';
import { Trash2, User, ChevronRight, Loader2, Edit2 } from 'lucide-react';

const { useState, useEffect } = React;

interface POSMainScreenProps {
  user: StaffMember;
  session: POSSession;
  onLogout: () => void;
}

const POSMainScreen: React.FC<POSMainScreenProps> = ({ user, session }) => {
  if (!session) return <div className="p-10 text-center text-red-500">Session invalide</div>;

  // --- ETATS ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);

  // Gestion MODAL PRODUIT
  const [productToConfigure, setProductToConfigure] = useState<Product | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);

  // --- CHARGEMENT ---
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedCategory) loadProducts(selectedCategory);
  }, [selectedCategory]);

  const loadInitialData = async () => {
    try {
      let cats = await window.electronAPI.db.getCategories();
      if (cats.length === 0) {
        setIsSyncing(true);
        try {
          await window.electronAPI.db.syncFullPull();
          cats = await window.electronAPI.db.getCategories();
        } catch (syncErr) {
          console.error("❌ Erreur critique synchro:", syncErr);
        } finally {
          setIsSyncing(false);
        }
      }
      setCategories(cats);
      if (cats.length > 0) {
          setSelectedCategory(cats[0].id);
      }
    } catch (e) {
      console.error("Erreur chargement:", e);
      setIsSyncing(false);
    }
  };

  const loadProducts = async (catId: string) => {
    try {
        const prods = await window.electronAPI.db.getProductsByCategory(catId);
        setProducts(prods);
    } catch (e) { console.error(e); }
  };

  // --- LOGIQUE PANIER ---
  
  const handleProductClick = (product: Product) => {
    setEditingIndex(null);
    if (product.price === 0 || product.type === 'variable' || product.type === 'combo') {
      setProductToConfigure(product);
    } else {
      handleProductSave(product, undefined, 1, []);
    }
  };

  const handleEditCartItem = (index: number) => {
    const item = cart[index];
    setEditingIndex(index);
    setProductToConfigure(item.product);
  };

  const handleProductSave = (product: Product, variation?: ProductVariation, qty = 1, options: OptionItem[] = []) => {
    setCart(prev => {
      if (editingIndex !== null) {
        const newCart = [...prev];
        newCart[editingIndex] = { product, variation, qty, options };
        return newCart;
      }

      const optionIds = options.map(o => o.id).sort().join('-');
      const itemId = `${product.id}-${variation?.id || 'base'}-${optionIds}`;

      const existingIndex = prev.findIndex(item => {
        const currentOptionIds = (item.options || []).map(o => o.id).sort().join('-');
        const currentItemId = `${item.product.id}-${item.variation?.id || 'base'}-${currentOptionIds}`;
        return currentItemId === itemId;
      });

      if (existingIndex >= 0) {
        const newCart = [...prev];
        newCart[existingIndex].qty += qty;
        return newCart;
      }
      return [...prev, { product, variation, qty, options }];
    });

    setProductToConfigure(null);
    setEditingIndex(null);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((sum, item) => {
    const base = item.variation ? item.variation.price : item.product.price;
    const opts = (item.options || []).reduce((acc, opt) => acc + (opt.price || 0), 0);
    return sum + ((base + opts) * item.qty);
  }, 0);

  const handlePayment = async (method: 'cash' | 'card', amountReceived: number) => {
    try {
        const result = await window.electronAPI.db.createOrder({
            items: cart,
            total: cartTotal,
            paymentMethod: method,
            amountReceived,
            storeId: user.store_id || session.store_id,
            sessionId: session.id,
            customerId: currentCustomer?.id,
            orderType: orderType
        });

        if (result.success) {
            setCart([]);
            setCurrentCustomer(null);
            setShowPaymentModal(false);
        } else {
            alert("Erreur: " + result.error);
        }
    } catch (e) {
        console.error(e);
        alert("Erreur critique");
    }
  };

  if (isSyncing) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-100 dark:bg-slate-950 text-slate-500 font-sans z-[100] relative">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Initialisation de la caisse</h2>
        <p className="text-sm">Synchronisation du menu et des produits...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-slate-100 dark:bg-slate-950 overflow-hidden font-sans relative isolate">
      
      {/* 1. GAUCHE: CATEGORIES */}
      <div className="w-28 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-4 overflow-y-auto hide-scrollbar z-50 shadow-lg shrink-0">
        {categories.map(cat => (
          <button 
            key={cat.id} 
            onClick={() => setSelectedCategory(cat.id)} 
            className={`w-24 mb-3 rounded-xl flex flex-col items-center justify-center p-2 transition-all group relative ${
                selectedCategory === cat.id 
                ? 'bg-orange-50 dark:bg-orange-900/20 ring-2 ring-primary shadow-md' 
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className={`w-14 h-14 rounded-full mb-2 flex items-center justify-center text-2xl overflow-hidden border ${selectedCategory === cat.id ? 'border-primary' : 'border-slate-200 dark:border-slate-700'} bg-white`}>
              {cat.image_url ? <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" /> : <span>🍽️</span>}
            </div>
            <span className={`text-[10px] font-bold text-center leading-tight line-clamp-2 uppercase ${selectedCategory === cat.id ? 'text-primary' : 'text-slate-500'}`}>
                {cat.name}
            </span>
            {selectedCategory === cat.id && <div className="absolute right-[-14px] top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-100 dark:bg-slate-950 rotate-45 border-l border-b border-slate-200 dark:border-slate-800 hidden lg:block"></div>}
          </button>
        ))}
      </div>

      {/* 2. CENTRE: GRILLE PRODUITS */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-100 dark:bg-slate-950 relative z-0">
        <div className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shadow-sm z-40 relative">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <OrderModeButton active={orderType === 'dine_in'} label="Sur Place" icon="🍽️" onClick={() => setOrderType('dine_in')} />
                <OrderModeButton active={orderType === 'takeaway'} label="Emporté" icon="🛍️" onClick={() => setOrderType('takeaway')} />
                <OrderModeButton active={orderType === 'delivery'} label="Livraison" icon="🛵" onClick={() => setOrderType('delivery')} />
            </div>
            <button 
                onClick={() => setShowCustomerModal(true)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                    currentCustomer 
                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
            >
                <User size={18} />
                {currentCustomer ? <span className="font-bold text-sm">{currentCustomer.full_name}</span> : <span className="text-sm font-bold">Sélectionner Client</span>}
            </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar relative z-0">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
            {products.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center text-slate-400 mt-20">
                    <span className="text-4xl mb-2">🥗</span>
                    <p>Aucun produit disponible</p>
                </div>
            )}
            {products.map(product => (
                <ProductCard key={product.id} product={product} onClick={() => handleProductClick(product)} />
            ))}
            </div>
        </div>
      </div>

      {/* 3. DROITE: PANIER */}
      <div className="w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full shadow-2xl z-50 shrink-0 relative">
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Panier</h3>
            <span className="text-[10px] px-2 py-1 rounded-md font-bold uppercase bg-orange-100 text-primary dark:bg-orange-900/30">
                {orderType.replace('_', ' ')}
            </span>
        </div>
        
        {/* Liste Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/50">
            {cart.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                    <span className="text-5xl mb-4">🛒</span>
                    <p>Votre panier est vide</p>
                </div>
            )}
            {cart.map((item, idx) => {
                const itemTotal = (item.variation ? item.variation.price : item.product.price) + (item.options || []).reduce((acc, o) => acc + (o.price || 0), 0);
                
                return (
                <div key={idx} className="flex justify-between items-start bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm group hover:border-primary/50 transition-colors">
                    <div className="flex items-start gap-3 overflow-hidden">
                        <div className="w-6 h-6 bg-slate-900 text-white rounded-md flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                            {item.qty}
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{item.product.name}</p>
                            {item.variation && <p className="text-xs text-slate-500">📏 {item.variation.name}</p>}
                            {item.options && item.options.length > 0 && (
                                <p className="text-[10px] text-slate-400 leading-tight mt-1 line-clamp-2">
                                    + {item.options.map(o => o.name).join(', ')}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    <div className="text-right flex flex-col items-end shrink-0 ml-2">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                            {(itemTotal * item.qty).toFixed(2)}
                        </p>
                        
                        {/* ✅ BOUTONS TACTILES LARGES & TOUJOURS VISIBLES */}
                        <div className="flex gap-2 mt-2">
                            {/* BOUTON MODIFIER */}
                            <button 
                                onClick={() => handleEditCartItem(idx)}
                                className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 active:scale-95 transition-all"
                            >
                                <Edit2 size={18} />
                            </button>
                            {/* BOUTON SUPPRIMER */}
                            <button 
                                onClick={() => removeFromCart(idx)} 
                                className="w-10 h-10 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 active:scale-95 transition-all"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )})}
        </div>

        {/* Footer Total */}
        <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-10">
            <div className="flex justify-between items-center mb-6">
                <span className="text-slate-500 text-sm font-medium">Total à payer</span>
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {cartTotal.toFixed(2)} <span className="text-lg text-slate-400 font-normal">DH</span>
                </span>
            </div>
            <button 
                onClick={() => setShowPaymentModal(true)} 
                disabled={cart.length === 0} 
                className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
            >
                <span>ENCAISSER</span>
                <ChevronRight size={20} />
            </button>
        </div>
      </div>

      {/* MODALES */}
      {productToConfigure && (
        <ProductDetailsModal 
            product={productToConfigure} 
            initialValues={editingIndex !== null ? cart[editingIndex] : undefined}
            onClose={() => {
                setProductToConfigure(null);
                setEditingIndex(null);
            }} 
            onAddToCart={handleProductSave}
        />
      )}
      
      {showCustomerModal && <CustomerModal onClose={() => setShowCustomerModal(false)} onSelectCustomer={(c) => { setCurrentCustomer(c); setShowCustomerModal(false); }} />}
      {showPaymentModal && <PaymentModal total={cartTotal} onClose={() => setShowPaymentModal(false)} onConfirm={handlePayment} />}
    </div>
  );
};

// Sub-components Styling
const OrderModeButton: React.FC<{active: boolean; label: string; icon: string; onClick: () => void}> = ({ active, label, icon, onClick }) => (
  <button 
    onClick={onClick} 
    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-all ${
        active 
        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-black/5' 
        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
    }`}
  >
    <span>{icon}</span><span className="hidden xl:inline">{label}</span>
  </button>
);

const ProductCard: React.FC<{product: Product; onClick: () => void}> = ({ product, onClick }) => (
  <button 
    onClick={onClick} 
    className="group bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-primary hover:ring-1 hover:ring-primary hover:shadow-lg transition-all flex flex-col h-40 overflow-hidden text-left relative active:scale-95"
  >
    <div className="h-24 bg-slate-100 dark:bg-slate-800 w-full relative">
        {product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">🥗</div>}
    </div>
    <div className="p-2 flex flex-col justify-between flex-1">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs line-clamp-2">{product.name}</h3>
        <span className="text-sm font-black text-slate-900 dark:text-white">
            {product.price > 0 ? product.price.toFixed(0) : ""} <span className="text-[10px] font-normal text-slate-500">DH</span>
        </span>
    </div>
  </button>
);

export default POSMainScreen;