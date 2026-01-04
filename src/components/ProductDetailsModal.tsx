import * as React from 'react';
import { Product, ProductVariation, OptionGroupWithItems, OptionItem, CartItem, Ingredient } from '../types';
import { X, ShoppingCart, CheckCircle2, MessageSquare, Ban } from 'lucide-react'; // ✅ Imports nettoyés

const { useState, useEffect } = React;

interface ProductDetailsModalProps {
  product: Product;
  onClose: () => void;
  initialValues?: CartItem;
  onAddToCart: (product: Product, variation?: ProductVariation, qty?: number, options?: OptionItem[], note?: string, removedIngredients?: string[]) => void;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ product, onClose, initialValues, onAddToCart }) => {
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [optionGroups, setOptionGroups] = useState<OptionGroupWithItems[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, OptionItem[]>>({});
  
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]); 

  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const vars = await window.electronAPI.db.getProductVariations(product.id);
        setVariations(vars);
        if (initialValues?.variation) { const foundVar = vars.find(v => v.id === initialValues.variation?.id); if (foundVar) setSelectedVariation(foundVar); } 
        else if (vars.length > 0 && !initialValues) { setSelectedVariation(vars[0]); } 
        else { setSelectedVariation(null); }

        const groups = await window.electronAPI.db.getProductOptions(product.id);
        setOptionGroups(groups);
        
        const ings = await window.electronAPI.db.getProductIngredients(product.id);
        setIngredients(ings);

        const initialSelection: Record<string, OptionItem[]> = {};
        if (initialValues && initialValues.options) {
            initialValues.options.forEach(opt => { if (opt.group_id) { if (!initialSelection[opt.group_id]) initialSelection[opt.group_id] = []; initialSelection[opt.group_id].push(opt); } });
        } else {
            groups.forEach(g => { if ((g.min_selection || 0) >= 1 && g.items.length === 1) { initialSelection[g.id] = [g.items[0]]; } });
        }
        setSelectedOptions(initialSelection);

        if (initialValues) {
            setQty(initialValues.qty);
            setNote(initialValues.note || '');
            setRemovedIngredients(initialValues.removedIngredients || []);
        }

      } catch (e) { console.error("Erreur chargement détails", e); } 
      finally { setLoading(false); }
    };
    loadData();
  }, [product, initialValues]);

  const toggleIngredient = (ingName: string) => {
      setRemovedIngredients(prev => prev.includes(ingName) ? prev.filter(n => n !== ingName) : [...prev, ingName]);
  };

  const basePrice = selectedVariation ? selectedVariation.price : product.price;
  const optionsPrice = Object.values(selectedOptions).flat().reduce((acc, item) => acc + (item.price || 0), 0);
  const totalPrice = (basePrice + optionsPrice) * qty;

  const incrementOption = (group: OptionGroupWithItems, item: OptionItem) => {
    setSelectedOptions(prev => {
      const currentSelection = prev[group.id] || [];
      const maxSel = group.max_selection || 0;
      if (maxSel === 1) return { ...prev, [group.id]: [item] };
      if (maxSel > 0 && currentSelection.length >= maxSel) return prev; 
      return { ...prev, [group.id]: [...currentSelection, item] };
    });
  };

  const decrementOption = (group: OptionGroupWithItems, item: OptionItem) => {
    setSelectedOptions(prev => {
      const currentSelection = prev[group.id] || [];
      const indexToRemove = currentSelection.findIndex(i => i.id === item.id);
      if (indexToRemove === -1) return prev; 
      const newSelection = [...currentSelection];
      newSelection.splice(indexToRemove, 1);
      if (newSelection.length === 0) { const newState = { ...prev }; delete newState[group.id]; return newState; }
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
    onAddToCart(product, selectedVariation || undefined, qty, allSelectedOptions, note, removedIngredients);
    onClose();
  };

  const allValid = optionGroups.every(isGroupValid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-[95vw] h-[90vh] flex overflow-hidden">
        <div className="w-1/4 bg-slate-100 dark:bg-slate-950 relative hidden lg:block">
          {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-8xl opacity-10">🍔</div>}
        </div>
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900">
          <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0 shadow-sm z-10">
             <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{product.name}</h2></div>
             <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors"><X size={28}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {loading ? <div className="flex justify-center py-20"><span className="animate-spin text-4xl">⏳</span></div> : (
                <div className="space-y-6">
                    {/* Variantes */}
                    {variations.length > 0 && (
                        <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-sm text-slate-500 uppercase mb-3">📏 Taille</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {variations.map(v => (
                                    <button key={v.id} onClick={() => setSelectedVariation(v)} className={`p-4 rounded-xl border-2 transition-all ${selectedVariation?.id === v.id ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white'}`}>
                                        <span className="font-bold">{v.name}</span> <span className="text-sm">{v.price} DH</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Ingrédients */}
                    {ingredients.length > 0 && (
                        <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-sm text-slate-500 uppercase mb-3 flex items-center gap-2">❌ Ingrédients (Cliquer pour retirer)</h3>
                            <div className="flex flex-wrap gap-3">
                                {ingredients.map(ing => {
                                    const isRemoved = removedIngredients.includes(ing.name);
                                    return (
                                        <button key={ing.id} onClick={() => toggleIngredient(ing.name)} className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-all flex items-center gap-2 ${isRemoved ? 'bg-slate-100 border-slate-200 text-slate-400 line-through' : 'bg-green-50 border-green-500 text-green-700'}`}>
                                            {isRemoved ? <Ban size={16}/> : <CheckCircle2 size={16}/>}
                                            {ing.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {/* Options */}
                    {optionGroups.map(group => {
                        const valid = isGroupValid(group);
                        const max = group.max_selection || 0;
                        const currentGroupCount = (selectedOptions[group.id] || []).length;
                        const isMaxReached = max > 0 && currentGroupCount >= max;
                        return (
                            <div key={group.id} className={`p-4 rounded-xl border ${valid ? 'border-slate-200' : 'border-red-200 bg-red-50/50'}`}>
                                <h3 className="font-bold text-sm uppercase mb-3">{group.name}</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {group.items.map(item => {
                                        const count = (selectedOptions[group.id] || []).filter(i => i.id === item.id).length;
                                        const isSelected = count > 0;
                                        return (
                                            <div key={item.id} onClick={() => !isMaxReached || max === 1 ? incrementOption(group, item) : null} className={`flex justify-between p-3 rounded-lg border cursor-pointer ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-50 hover:bg-white'}`}>
                                                <span>{item.name} {item.price ? `+${item.price}` : ''}</span>
                                                {isSelected && <div onClick={(e) => {e.stopPropagation(); decrementOption(group, item)}} className="bg-white/20 rounded px-2">-{count}</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                    {/* Note */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <h3 className="font-bold text-sm text-slate-500 uppercase mb-3 flex items-center gap-2"><MessageSquare size={16}/> Note</h3>
                        <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-3 rounded-lg border bg-slate-50 h-20 text-sm resize-none" placeholder="Ex: Sans sel..."/>
                    </div>
                </div>
            )}
          </div>
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] shrink-0 z-20">
            <div className="flex gap-4">
               <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl h-16 w-40 shrink-0">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-12 h-full flex items-center justify-center text-slate-500 text-xl font-bold">-</button>
                  <span className="flex-1 text-center font-black text-2xl text-slate-900 dark:text-white">{qty}</span>
                  <button onClick={() => setQty(qty + 1)} className="w-12 h-full flex items-center justify-center text-slate-500 text-xl font-bold">+</button>
               </div>
               <button onClick={handleConfirm} disabled={!allValid || loading} className={`flex-1 h-16 rounded-xl font-black text-xl flex items-center justify-between px-8 transition-all ${allValid ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <span className="flex items-center gap-3"><ShoppingCart size={24} /> {initialValues ? "METTRE À JOUR" : "AJOUTER"}</span>
                    <span className="bg-black/10 px-3 py-1 rounded-lg">{totalPrice.toFixed(2)} DH</span>
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsModal;