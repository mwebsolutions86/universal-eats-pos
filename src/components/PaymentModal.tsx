import * as React from 'react';

const { useState, useEffect } = React;

interface PaymentModalProps {
  total: number;
  onClose: () => void;
  onConfirm: (method: 'cash' | 'card', amountReceived: number) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ total, onClose, onConfirm }) => {
  const [method, setMethod] = useState<'cash' | 'card'>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [change, setChange] = useState<number>(0);

  // Suggestions de billets (ex: 50, 100, 200 DH)
  const suggestions = [50, 100, 200];

  useEffect(() => {
    if (method === 'cash') {
      const received = parseFloat(cashReceived);
      if (!isNaN(received) && received >= total) {
        setChange(received - total);
      } else {
        setChange(0);
      }
    }
  }, [cashReceived, total, method]);

  const handleNumClick = (val: string) => {
    setCashReceived(prev => prev + val);
  };

  const handleSubmit = () => {
    const received = method === 'card' ? total : parseFloat(cashReceived);
    if (method === 'cash' && (isNaN(received) || received < total)) return;
    onConfirm(method, received);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-4xl h-[600px] flex overflow-hidden shadow-2xl">
        
        {/* COLONNE GAUCHE : SÉLECTION MÉTHODE */}
        <div className="w-1/3 bg-gray-50 border-r border-gray-200 p-6 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Moyen de Paiement</h2>
          
          <button 
            onClick={() => setMethod('cash')}
            className={`flex-1 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all ${
              method === 'cash' ? 'border-green-500 bg-green-50 text-green-700 shadow-inner' : 'border-gray-200 bg-white hover:bg-gray-100'
            }`}
          >
            <span className="text-4xl">💵</span>
            <span className="font-black text-lg">ESPÈCES</span>
          </button>

          <button 
            onClick={() => setMethod('card')}
            className={`flex-1 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all ${
              method === 'card' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-inner' : 'border-gray-200 bg-white hover:bg-gray-100'
            }`}
          >
            <span className="text-4xl">💳</span>
            <span className="font-black text-lg">CARTE</span>
          </button>
          
          <button onClick={onClose} className="py-4 text-gray-400 font-bold hover:text-red-500">
            ANNULER
          </button>
        </div>

        {/* COLONNE DROITE : CALCUL & PAVÉ NUMÉRIQUE */}
        <div className="w-2/3 p-8 flex flex-col">
          <div className="flex justify-between items-end mb-8 pb-4 border-b border-gray-100">
            <div>
              <p className="text-gray-400 font-medium text-sm">Total à payer</p>
              <p className="text-5xl font-black text-gray-900">{total.toFixed(2)} <span className="text-xl">DH</span></p>
            </div>
            
            {method === 'cash' && (
              <div className="text-right">
                <p className="text-gray-400 font-medium text-sm">Rendu monnaie</p>
                <p className={`text-4xl font-black ${change > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                  {change.toFixed(2)} <span className="text-lg">DH</span>
                </p>
              </div>
            )}
          </div>

          {method === 'cash' ? (
            <div className="flex-1 flex gap-6">
              {/* Pavé Numérique */}
              <div className="grid grid-cols-3 gap-3 flex-1">
                {[1,2,3,4,5,6,7,8,9].map(n => (
                  <button key={n} onClick={() => handleNumClick(n.toString())} className="h-16 rounded-xl bg-gray-100 text-2xl font-bold hover:bg-gray-200 active:bg-gray-300 transition-colors">
                    {n}
                  </button>
                ))}
                <button onClick={() => handleNumClick('.')} className="h-16 rounded-xl bg-gray-100 text-2xl font-bold hover:bg-gray-200">.</button>
                <button onClick={() => handleNumClick('0')} className="h-16 rounded-xl bg-gray-100 text-2xl font-bold hover:bg-gray-200">0</button>
                <button onClick={() => setCashReceived(prev => prev.slice(0, -1))} className="h-16 rounded-xl bg-red-100 text-red-500 font-bold hover:bg-red-200">⌫</button>
              </div>

              {/* Suggestions */}
              <div className="w-1/3 flex flex-col gap-3">
                {suggestions.map(amount => (
                  amount >= total && (
                    <button 
                      key={amount} 
                      onClick={() => setCashReceived(amount.toString())}
                      className="py-3 rounded-xl bg-orange-50 text-orange-700 font-bold border border-orange-100 hover:bg-orange-100"
                    >
                      {amount} DH
                    </button>
                  )
                ))}
                <div className="mt-auto">
                    <p className="text-gray-400 text-xs mb-1 font-bold">REÇU CLIENT</p>
                    <div className="h-16 bg-gray-50 rounded-xl border-2 border-gray-200 flex items-center px-4 text-2xl font-black text-gray-800 tracking-widest">
                        {cashReceived || '0.00'}
                    </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-300">
               <div className="w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                 <span className="text-6xl animate-pulse">📡</span>
               </div>
               <h3 className="text-2xl font-bold text-gray-800">En attente du TPE...</h3>
               <p className="text-gray-400">Veuillez insérer la carte ou utiliser le sans contact</p>
               <button onClick={() => onConfirm('card', total)} className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30">
                 SIMULER PAIEMENT VALIDE
               </button>
            </div>
          )}

          {method === 'cash' && (
             <button 
               onClick={handleSubmit}
               disabled={!cashReceived || parseFloat(cashReceived) < total}
               className="w-full mt-6 py-5 bg-green-600 text-white rounded-2xl font-black text-xl hover:bg-green-700 transition-all shadow-xl shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               VALIDER L'ENCAISSEMENT
             </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;