import * as React from 'react';
import { Product, ProductVariation, OptionGroupWithItems, OptionItem, CartItem } from '../types';
import { X, Minus, Plus, ShoppingCart, CheckCircle2, AlertCircle, Save } from 'lucide-react';

const { useState, useEffect } = React;

interface ProductDetailsModalProps {
  product: Product;
  onClose: () => void;
  // Ajout de initialValues pour l'édition
  initialValues?: CartItem;
  onAddToCart: (product: Product, variation?: ProductVariation, qty?: number, options?: OptionItem[]) => void;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ product, onClose, initialValues, onAddToCart }) => {
  // --- ETATS ---
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [optionGroups, setOptionGroups] = useState<OptionGroupWithItems[]>([]);
  
  const [selectedOptions, setSelectedOptions] = useState<Record<string, OptionItem[]>>({}); 
  
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  // --- CHARGEMENT ---
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const vars = await window.electronAPI.db.getProductVariations(product.id);
        setVariations(vars);

        // 1. GESTION VARIATION (Initiale ou Édition)
        if (initialValues?.variation) {
            // Mode Édition : On cherche la variation correspondante par ID pour garder la référence objet correcte
            const foundVar = vars.find(v => v.id === initialValues.variation?.id);
            if (foundVar) setSelectedVariation(foundVar);
        } else if (vars.length > 0 && !initialValues) {
            // Mode Nouveau : On prend la première par défaut
            setSelectedVariation(vars[0]);
        } else {
            setSelectedVariation(null);
        }

        const groups = await window.electronAPI.db.getProductOptions(product.id);
        setOptionGroups(groups);
        
        // 2. GESTION OPTIONS (Initiale ou Édition)
        const initialSelection: Record<string, OptionItem[]> = {};

        if (initialValues && initialValues.options) {
            // MODE ÉDITION : On reconstruit le dictionnaire à partir du tableau plat du panier
            initialValues.options.forEach(opt => {
                if (opt.group_id) {
                    if (!initialSelection[opt.group_id]) initialSelection[opt.group_id] = [];
                    initialSelection[opt.group_id].push(opt);
                }
            });
        } else {
            // MODE NOUVEAU : Auto-select defaults
            groups.forEach(g => {
                if ((g.min_selection || 0) >= 1 && g.items.length === 1) {
                    initialSelection[g.id] = [g.items[0]];
                }
            });
        }
        
        setSelectedOptions(initialSelection);

        // 3. GESTION QUANTITÉ
        if (initialValues) {
            setQty(initialValues.qty);
        }

      } catch (e) {
        console.error("Erreur chargement détails produit", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [product, initialValues]); // Recharger si product ou initialValues change

  // --- LOGIQUE PRIX ---
  const basePrice = selectedVariation ? selectedVariation.price : product.price;
  const optionsPrice = Object.values(selectedOptions).flat().reduce((acc, item) => acc + (item.price || 0), 0);
  const totalPrice = (basePrice + optionsPrice) * qty;

  // --- LOGIQUE SELECTION (inchangée) ---
  const incrementOption = (group: OptionGroupWithItems, item: OptionItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedOptions(prev => {
      const currentSelection = prev[group.id] || [];
      const maxSel = group.max_selection || 0;

      if (maxSel === 1) return { ...prev, [group.id]: [item] };
      if (maxSel > 0 && currentSelection.length >= maxSel) return prev; 
      return { ...prev, [group.id]: [...currentSelection, item] };
    });
  };

  const decrementOption = (group: OptionGroupWithItems, item: OptionItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedOptions(prev => {
      const currentSelection = prev[group.id] || [];
      const indexToRemove = currentSelection.findIndex(i => i.id === item.id);
      if (indexToRemove === -1) return prev; 
      const newSelection = [...currentSelection];
      newSelection.splice(indexToRemove, 1);
      if (newSelection.length === 0) {
        const newState = { ...prev };
        delete newState[group.id];
        return newState;
      }
      return { ...prev, [group.id]: newSelection };
    });
  };

  const isGroupValid = (group: OptionGroupWithItems) => {
    const count = (selectedOptions[group.id] || []).length;
    const min = group.min_selection || 0;
    return min === 0 || count >= min;
  };

  const handleConfirm = () => {
    const allSelectedOptions = Object.values(selectedOptions).flat();
    onAddToCart(product, selectedVariation || undefined, qty, allSelectedOptions);
    onClose();
  };

  const allValid = optionGroups.every(isGroupValid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-[95vw] h-[90vh] flex overflow-hidden">
        
        {/* COLONNE IMAGE */}
        <div className="w-1/4 bg-slate-100 dark:bg-slate-950 relative hidden lg:block">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-8xl opacity-10">🍔</div>
          )}
           {/* Badge Édition si nécessaire */}
           {initialValues && (
            <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg uppercase tracking-wider">
                Mode Modification
            </div>
          )}
        </div>

        {/* COLONNE CONTENU */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900">
          
          {/* Header */}
          <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0 shadow-sm z-10">
             <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {initialValues ? `Modifier : ${product.name}` : product.name}
                </h2>
                {product.description && <p className="text-slate-500 text-sm line-clamp-1">{product.description}</p>}
             </div>
             <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors">
               <X size={28}/>
             </button>
          </div>
            
          {/* SCROLLABLE AREA */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {loading ? (
                <div className="flex justify-center py-20"><span className="animate-spin text-4xl">⏳</span></div>
            ) : (
                <div className="space-y-6">
                    {/* VARIATIONS */}
                    {variations.length > 0 && (
                        <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-sm text-slate-500 uppercase mb-3 flex items-center gap-2">📏 Taille</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {variations.map(v => (
                                    <button 
                                        key={v.id} 
                                        onClick={() => setSelectedVariation(v)}
                                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                                            selectedVariation?.id === v.id 
                                            ? 'border-primary bg-primary text-white shadow-lg scale-105' 
                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/50'
                                        }`}
                                    >
                                        <span className="font-bold text-lg">{v.name}</span>
                                        <span className={`text-sm font-medium ${selectedVariation?.id === v.id ? 'text-white/90' : 'text-slate-500'}`}>{v.price} DH</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* OPTIONS */}
                    {optionGroups.map(group => {
                        const valid = isGroupValid(group);
                        const min = group.min_selection || 0;
                        const max = group.max_selection || 0;
                        const currentGroupCount = (selectedOptions[group.id] || []).length;
                        const isMaxReached = max > 0 && currentGroupCount >= max;

                        return (
                            <div key={group.id} className={`p-4 rounded-xl border ${valid ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50' : 'border-red-200 bg-red-50/50 dark:border-red-900/30'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        {valid ? <CheckCircle2 className="text-green-500" size={18}/> : <AlertCircle className="text-red-500" size={18}/>}
                                        <h3 className="font-bold text-sm uppercase tracking-wide text-slate-700 dark:text-slate-200">{group.name}</h3>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${valid ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-600'}`}>
                                        {min > 0 ? `Min ${min}` : 'Optionnel'} {max > 0 ? ` / Max ${max}` : ''} <span className="ml-1 text-slate-400">({currentGroupCount} sélec.)</span>
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                    {group.items.map(item => {
                                        const count = (selectedOptions[group.id] || []).filter(i => i.id === item.id).length;
                                        const isSelected = count > 0;
                                        return (
                                            <div 
                                                key={item.id}
                                                onClick={() => !isMaxReached || max === 1 ? incrementOption(group, item) : null}
                                                className={`relative flex items-center justify-between px-3 py-3 rounded-lg border text-left transition-all select-none ${
                                                    isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md' : isMaxReached && max > 1 ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-100' : 'cursor-pointer bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-white'
                                                }`}
                                            >
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <div className="font-bold text-sm truncate">{item.name}</div>
                                                    {(item.price || 0) > 0 && <div className={`text-xs font-medium ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>+{(item.price || 0)}</div>}
                                                </div>
                                                {isSelected ? (
                                                    <div className="flex items-center gap-1 bg-black/20 rounded-lg p-0.5" onClick={(e) => e.stopPropagation()}>
                                                        <button onClick={(e) => decrementOption(group, item, e)} className="w-7 h-7 flex items-center justify-center bg-white text-blue-600 rounded shadow-sm hover:bg-blue-50"><Minus size={14} strokeWidth={3} /></button>
                                                        <span className="w-5 text-center font-bold text-sm">{count}</span>
                                                        {max !== 1 && (
                                                            <button onClick={(e) => !isMaxReached ? incrementOption(group, item, e) : null} className={`w-7 h-7 flex items-center justify-center rounded shadow-sm ${isMaxReached ? 'bg-white/20 text-white/50 cursor-not-allowed' : 'bg-white text-blue-600 hover:bg-blue-50'}`}><Plus size={14} strokeWidth={3} /></button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400"><Plus size={14} /></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] shrink-0 z-20">
            <div className="flex gap-4">
               <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl h-16 w-40 shrink-0">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-12 h-full flex items-center justify-center text-slate-500 hover:text-slate-900 text-xl font-bold">-</button>
                  <span className="flex-1 text-center font-black text-2xl text-slate-900 dark:text-white">{qty}</span>
                  <button onClick={() => setQty(qty + 1)} className="w-12 h-full flex items-center justify-center text-slate-500 hover:text-slate-900 text-xl font-bold">+</button>
               </div>
               
               <button 
                    onClick={handleConfirm}
                    disabled={!allValid || loading}
                    className={`flex-1 h-16 rounded-xl font-black text-xl flex items-center justify-between px-8 transition-all ${
                        allValid 
                        ? initialValues ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20' : 'bg-green-600 hover:bg-green-500 text-white shadow-xl shadow-green-500/20'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    <span className="flex items-center gap-3">
                        {allValid ? initialValues ? <Save size={24}/> : <ShoppingCart size={24} /> : <AlertCircle size={24}/>}
                        {allValid ? (initialValues ? "METTRE À JOUR" : "AJOUTER") : "COMPLÉTER"}
                    </span>
                    <span className="bg-black/10 px-3 py-1 rounded-lg">
                        {totalPrice.toFixed(2)} DH
                    </span>
                </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProductDetailsModal;