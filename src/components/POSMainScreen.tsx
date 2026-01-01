import * as React from 'react';
import { StaffMember, Category, Product, ProductVariation, Order, Customer, OrderType, POSSession, CartItem } from '../types';
import ProductDetailsModal from './ProductDetailsModal';
import LiveOrdersTab from './LiveOrdersTab';
import CustomerModal from './CustomerModal';
import PaymentModal from './PaymentModal';

const { useState, useEffect } = React;

interface POSMainScreenProps {
  user: StaffMember;
  session: POSSession;
  onLogout: () => void;
}

const POSMainScreen: React.FC<POSMainScreenProps> = ({ user, session, onLogout }) => {
  if (!session) return <div className="p-10 text-center">Session invalide</div>;

  const [activeTab, setActiveTab] = useState<'pos' | 'live-orders' | 'history'>('pos');
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);

  const [productToConfigure, setProductToConfigure] = useState<Product | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [liveOrders, setLiveOrders] = useState<Order[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [processingOrder, setProcessingOrder] = useState(false);

  const role = (user.role || '').toLowerCase();
  const isAdminOrManager = ['owner', 'manager', 'super_admin', 'admin'].includes(role);

  useEffect(() => {
    loadInitialData();
    const interval = setInterval(async () => {
        try { 
            await window.electronAPI.db.syncLiveOrders(); 
            loadLiveOrders(); 
        } catch(e) { 
            console.error("Polling silent error:", e); // Bloc catch non vide
        }
    }, 15000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedCategory) loadProducts(selectedCategory);
  }, [selectedCategory]);

  const loadInitialData = async () => {
    try {
      const cats = await window.electronAPI.db.getCategories();
      setCategories(cats);
      if (cats.length > 0) {
          const firstCatId = cats[0].id;
          setSelectedCategory(firstCatId);
          await loadProducts(firstCatId);
      }
      loadLiveOrders();
    } catch (e) {
      console.error("Erreur chargement:", e);
    }
  };

  const loadProducts = async (catId: string) => {
    try {
        const prods = await window.electronAPI.db.getProductsByCategory(catId);
        setProducts(prods);
    } catch (e) { console.error(e); }
  };

  const loadLiveOrders = async () => {
    const orders = await window.electronAPI.db.getLiveOrders();
    setLiveOrders(orders);
  };

  const handleProductClick = (product: Product) => {
    if (product.price === 0 || product.type === 'variable' || product.type === 'combo') {
      setProductToConfigure(product);
    } else {
      addToCart(product);
    }
  };

  // Correction : suppression de ': number' pour qty qui est inféré
  const addToCart = (product: Product, variation?: ProductVariation, qty = 1) => {
    setCart(prev => {
      const itemId = variation ? `${product.id}-${variation.id}` : product.id;
      const existingIndex = prev.findIndex(item => {
        const currentItemId = item.variation ? `${item.product.id}-${item.variation.id}` : item.product.id;
        return currentItemId === itemId;
      });

      if (existingIndex >= 0) {
        const newCart = [...prev];
        newCart[existingIndex].qty += qty;
        return newCart;
      }
      return [...prev, { product, variation, qty }];
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

  const handlePayment = async (method: 'cash' | 'card', amountReceived: number) => {
    setProcessingOrder(true);
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
            alert(`✅ Commande #${result.orderId?.slice(0,8)} validée !`);
            loadLiveOrders();
        } else {
            alert("Erreur: " + result.error);
        }
    } catch (e) {
        console.error(e);
        alert("Erreur critique");
    } finally {
        setProcessingOrder(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans">
      
      <div className="w-20 bg-gray-900 flex flex-col items-center py-6 gap-6 shrink-0 z-50 text-white shadow-xl">
        <div className="mb-4"><div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center font-bold text-xl">UE</div></div>
        <NavButton icon="⚡" label="Caisse" active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} />
        <NavButton icon="🛵" label="Live" active={activeTab === 'live-orders'} onClick={() => setActiveTab('live-orders')} badge={liveOrders.length} />
        {isAdminOrManager && <NavButton icon="📊" label="Stats" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />}
        <div className="mt-auto flex flex-col items-center gap-4">
           <button onClick={onLogout} className="w-10 h-10 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">⏻</button>
        </div>
      </div>

      {activeTab === 'pos' ? (
        <>
          <div className="w-32 bg-white border-r border-gray-200 flex flex-col items-center py-2 overflow-y-auto hide-scrollbar shrink-0 z-20">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`w-28 mb-3 rounded-xl flex flex-col items-center justify-center p-2 transition-all group ${selectedCategory === cat.id ? 'bg-orange-50 ring-2 ring-orange-500 shadow-md' : 'hover:bg-gray-100'}`}>
                <div className="w-16 h-16 rounded-full mb-2 flex items-center justify-center text-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
                  {cat.image_url ? <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" /> : <span>🍔</span>}
                </div>
                <span className={`text-[11px] font-bold text-center leading-tight line-clamp-2 uppercase ${selectedCategory === cat.id ? 'text-orange-700' : 'text-gray-500'}`}>{cat.name}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col h-full min-w-0 bg-gray-100 relative">
            <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm z-10">
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <OrderModeButton active={orderType === 'dine_in'} label="Sur Place" icon="🍽️" onClick={() => setOrderType('dine_in')} />
                <OrderModeButton active={orderType === 'takeaway'} label="Emporté" icon="🛍️" onClick={() => setOrderType('takeaway')} />
                <OrderModeButton active={orderType === 'delivery'} label="Livraison" icon="🛵" onClick={() => setOrderType('delivery')} />
              </div>
              <div className="flex items-center gap-4">
                 <button onClick={() => setShowCustomerModal(true)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${currentCustomer ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                  <span className="text-lg">👤</span>
                  {currentCustomer ? <span className="font-bold text-xs">{currentCustomer.full_name}</span> : <span className="text-xs font-bold">CLIENT ?</span>}
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-20">
                {products.length === 0 && <div className="col-span-full text-center text-gray-400 mt-10">Aucun produit dans cette catégorie</div>}
                {products.map(product => (
                  <ProductCard key={product.id} product={product} onClick={() => handleProductClick(product)} />
                ))}
              </div>
            </div>
          </div>

          <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full shadow-2xl z-30 shrink-0">
            <CartPanel cart={cart} total={cartTotal} orderType={orderType} onRemove={removeFromCart} onCheckout={() => setShowPaymentModal(true)} />
          </div>
        </>
      ) : activeTab === 'live-orders' ? (
        <LiveOrdersTab orders={liveOrders} onProcessOrder={(o) => console.log(o)} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 font-bold bg-gray-50">Construction...</div>
      )}

      {productToConfigure && <ProductDetailsModal product={productToConfigure} onClose={() => setProductToConfigure(null)} onAddToCart={addToCart} />}
      {showCustomerModal && <CustomerModal onClose={() => setShowCustomerModal(false)} onSelectCustomer={(c) => { setCurrentCustomer(c); setShowCustomerModal(false); }} />}
      {showPaymentModal && <PaymentModal total={cartTotal} onClose={() => setShowPaymentModal(false)} onConfirm={handlePayment} />}
    </div>
  );
};

const OrderModeButton: React.FC<{active: boolean; label: string; icon: string; onClick: () => void}> = ({ active, label, icon, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-all ${active ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}><span>{icon}</span><span className="hidden xl:inline">{label}</span></button>
);
const NavButton: React.FC<{icon: string; label: string; active: boolean; onClick: () => void; badge?: number}> = ({ icon, label, active, onClick, badge }) => (
  <button onClick={onClick} className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all relative ${active ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-gray-400 hover:bg-gray-800'}`}>
    <span className="text-2xl mb-0.5">{icon}</span><span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
    {badge !== undefined && badge > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-gray-900 font-bold">{badge}</span>}
  </button>
);
const ProductCard: React.FC<{product: Product; onClick: () => void}> = ({ product, onClick }) => (
  <button onClick={onClick} className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:border-orange-500 hover:shadow-lg transition-all flex flex-col h-40 overflow-hidden text-left relative active:scale-95">
    <div className="h-24 bg-gray-100 w-full relative">{product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">🍽️</div>}</div>
    <div className="p-2 flex flex-col justify-between flex-1"><h3 className="font-bold text-gray-800 text-xs line-clamp-2">{product.name}</h3><span className="text-sm font-black text-gray-900">{product.price > 0 ? product.price.toFixed(0) : ""} <span className="text-[10px] font-normal text-gray-500">DH</span></span></div>
  </button>
);
const CartPanel: React.FC<{cart: CartItem[]; total: number; orderType: string; onRemove: (i: number) => void; onCheckout: () => void}> = ({ cart, total, orderType, onRemove, onCheckout }) => (
  <>
    <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100 bg-white"><h3 className="font-bold text-lg text-gray-800">Panier</h3><span className="text-[10px] px-2 py-1 rounded-md font-bold uppercase bg-orange-100 text-orange-700">{orderType}</span></div>
    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/50">
      {cart.map((item, idx) => (
        <div key={idx} className="flex justify-between items-start bg-white p-3 rounded-xl border border-gray-100 shadow-sm group">
          <div className="flex items-start gap-3"><div className="w-6 h-6 bg-gray-900 text-white rounded-md flex items-center justify-center font-bold text-xs">{item.qty}</div><div><p className="font-bold text-gray-800 text-sm">{item.product.name}</p>{item.variation && <p className="text-xs text-gray-500">+ {item.variation.name}</p>}</div></div>
          <div className="text-right"><p className="font-bold text-sm text-gray-900">{((item.variation ? item.variation.price : item.product.price) * item.qty).toFixed(2)}</p><button onClick={() => onRemove(idx)} className="text-[10px] text-red-500 font-bold opacity-0 group-hover:opacity-100">SUPPRIMER</button></div>
        </div>
      ))}
    </div>
    <div className="p-5 bg-white border-t border-gray-200">
      <div className="flex justify-between items-center mb-6"><span className="text-gray-500 text-sm font-medium">Total</span><span className="text-4xl font-black text-gray-900">{total.toFixed(2)} <span className="text-lg text-gray-400">DH</span></span></div>
      <button onClick={onCheckout} disabled={cart.length === 0} className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-lg hover:bg-orange-600 transition-all disabled:opacity-50 active:scale-95">ENCAISSER →</button>
    </div>
  </>
);

export default POSMainScreen;