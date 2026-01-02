import * as React from 'react';
import { Product, ProductVariation, OptionGroupWithItems, OptionItem } from '../types';
import { X, Minus, Plus, ShoppingCart, CheckCircle2, Circle } from 'lucide-react';

const { useState, useEffect } = React;

interface ProductDetailsModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, variation?: ProductVariation, qty?: number, options?: OptionItem[]) => void;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ product, onClose, onAddToCart }) => {
  // --- ETATS ---
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  
  const [optionGroups, setOptionGroups] = useState<OptionGroupWithItems[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, OptionItem[]>>({}); // Key: GroupID

  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  // --- CHARGEMENT ---
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 1. Charger Variations
        const vars = await window.electronAPI.db.getProductVariations(product.id);
        setVariations(vars);
        if (vars.length > 0) setSelectedVariation(vars[0]);

        // 2. Charger Options (Suppléments)
        const groups = await window.electronAPI.db.getProductOptions(product.id);
        setOptionGroups(groups);
        
        // Pré-sélection par défaut
        const initialOptions: Record<string, OptionItem[]> = {};
        setSelectedOptions(initialOptions);

      } catch (e) {
        console.error("Erreur chargement détails produit", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [product]);

  // --- LOGIQUE PRIX ---
  const basePrice = selectedVariation ? selectedVariation.price : product.price;
  
  // ✅ CORRECTION 1 : Sécurisation du prix (item.price || 0)
  const optionsPrice = Object.values(selectedOptions).flat().reduce((acc, item) => acc + (item.price || 0), 0);
  
  const unitPrice = basePrice + optionsPrice;
  const totalPrice = unitPrice * qty;

  // --- HANDLERS ---
  const handleOptionToggle = (group: OptionGroupWithItems, item: OptionItem) => {
    setSelectedOptions(prev => {
      const currentSelection = prev[group.id] || [];
      const isSelected = currentSelection.find(i => i.id === item.id);

      // CAS 1 : Radio (1 choix max)
      // ✅ CORRECTION 2 : Sécurisation min/max selection
      const maxSel = group.max_selection || 0;
      const minSel = group.min_selection || 0;

      if (maxSel === 1) {
        // Si c'est déjà sélectionné et que min_selection est 0, on peut désélectionner
        if (isSelected && minSel === 0) {
            const newState = { ...prev };
            delete newState[group.id];
            return newState;
        }
        // Sinon on remplace
        return { ...prev, [group.id]: [item] };
      }

      // CAS 2 : Checkbox (Multi choix)
      if (isSelected) {
        return { ...prev, [group.id]: currentSelection.filter(i => i.id !== item.id) };
      } else {
        // Vérifier max selection
        if (maxSel > 0 && currentSelection.length >= maxSel) {
          return prev; 
        }
        return { ...prev, [group.id]: [...currentSelection, item] };
      }
    });
  };

  const validateSelection = () => {
    for (const group of optionGroups) {
      const selection = selectedOptions[group.id] || [];
      const minSel = group.min_selection || 0;
      if (minSel > 0 && selection.length < minSel) {
        alert(`Veuillez sélectionner au moins ${minSel} option(s) pour "${group.name}"`);
        return false;
      }
    }
    return true;
  };

  const handleConfirm = () => {
    if (!validateSelection()) return;
    const allSelectedOptions = Object.values(selectedOptions).flat();
    onAddToCart(product, selectedVariation || undefined, qty, allSelectedOptions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[600px]">
        
        {/* COLONNE GAUCHE : IMAGE */}
        <div className="w-full md:w-5/12 bg-slate-100 dark:bg-slate-950 relative shrink-0">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-8xl opacity-10">🍔</div>
          )}
          <button onClick={onClose} className="absolute top-4 left-4 bg-white/90 p-2 rounded-full text-slate-800 hover:bg-white md:hidden shadow-sm z-10">
            <X size={20}/>
          </button>
        </div>

        {/* COLONNE DROITE : DETAILS & OPTIONS */}
        <div className="w-full md:w-7/12 flex flex-col bg-white dark:bg-slate-900 min-w-0">
          
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start shrink-0">
             <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-1">{product.name}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">{product.description || "Aucune description."}</p>
             </div>
             <button onClick={onClose} className="hidden md:block text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
               <X size={28}/>
             </button>
          </div>
            
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {loading ? (
                <div className="flex justify-center py-10"><span className="animate-spin text-2xl">⏳</span></div>
            ) : (
                <div className="space-y-8">
                    
                    {/* SECTION VARIATIONS */}
                    {variations.length > 0 && (
                        <div>
                            <h3 className="font-bold text-xs text-slate-400 uppercase mb-3 tracking-wider flex items-center gap-2">
                                📏 Taille / Variation <span className="text-red-500">*</span>
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {variations.map(v => (
                                    <div 
                                        key={v.id} 
                                        onClick={() => setSelectedVariation(v)}
                                        className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all active:scale-[0.98] ${
                                            selectedVariation?.id === v.id 
                                            ? 'border-primary bg-orange-50 dark:bg-orange-900/20 dark:border-primary' 
                                            : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${
                                                selectedVariation?.id === v.id ? 'border-primary' : 'border-slate-300 dark:border-slate-600'
                                            }`}>
                                                {selectedVariation?.id === v.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                            </div>
                                            <span className={`font-bold text-sm ${selectedVariation?.id === v.id ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {v.name}
                                            </span>
                                        </div>
                                        <span className="font-black text-sm text-slate-900 dark:text-white">
                                            {v.price.toFixed(0)} <span className="text-[10px] font-normal text-slate-400">DH</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SECTION OPTIONS (CORRIGÉE) */}
                    {optionGroups.map(group => (
                        <div key={group.id}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    ✨ {group.name}
                                </h3>
                                {/* ✅ CORRECTION 3 : Sécurisation affichage min/max */}
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                    {(group.min_selection || 0) > 0 ? `Min ${group.min_selection}` : 'Optionnel'} 
                                    {group.max_selection ? ` / Max ${group.max_selection}` : ''}
                                </span>
                            </div>
                            
                            <div className="space-y-2">
                                {group.items.map(item => {
                                    const isSelected = (selectedOptions[group.id] || []).some(i => i.id === item.id);
                                    return (
                                        <div 
                                            key={item.id}
                                            onClick={() => handleOptionToggle(group, item)}
                                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all active:scale-[0.99] ${
                                                isSelected 
                                                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {isSelected 
                                                    ? <CheckCircle2 size={20} className="text-blue-500 fill-current" /> 
                                                    : <Circle size={20} className="text-slate-300 dark:text-slate-600" />
                                                }
                                                <span className={`text-sm font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {item.name}
                                                </span>
                                            </div>
                                            {/* ✅ CORRECTION 4 : Sécurisation affichage prix */}
                                            {(item.price || 0) > 0 && (
                                                <span className="font-bold text-sm text-slate-900 dark:text-white">
                                                    +{(item.price || 0).toFixed(0)} <span className="text-[10px] font-normal text-slate-400">DH</span>
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-12 h-12 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 rounded-l-xl text-slate-600 dark:text-slate-300"><Minus size={18}/></button>
                  <span className="w-10 text-center font-bold text-lg text-slate-900 dark:text-white">{qty}</span>
                  <button onClick={() => setQty(qty + 1)} className="w-12 h-12 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 rounded-r-xl text-slate-600 dark:text-slate-300"><Plus size={18}/></button>
               </div>
               <div className="text-right">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Total estimé</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{totalPrice.toFixed(2)} <span className="text-lg text-slate-400 font-normal">DH</span></p>
               </div>
            </div>
            
            <button 
                onClick={handleConfirm}
                disabled={loading}
                className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <ShoppingCart size={22} className="fill-current/20" />
                AJOUTER LA COMMANDE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsModal;