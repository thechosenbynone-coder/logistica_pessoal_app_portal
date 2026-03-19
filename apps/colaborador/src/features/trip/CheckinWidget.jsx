import React, { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, ArrowRight } from 'lucide-react';

const STATUS_COLORS = {
  'BASE': 'bg-slate-100 border-slate-300 text-slate-800',
  'MOBILIZANDO': 'bg-blue-100 border-blue-300 text-blue-800',
  'EM_DESLOCAMENTO': 'bg-purple-100 border-purple-300 text-purple-800',
  'AGUARDANDO_EMBARQUE': 'bg-amber-100 border-amber-300 text-amber-800',
  'EMBARCADO': 'bg-emerald-100 border-emerald-300 text-emerald-800',
  'FOLGA': 'bg-indigo-100 border-indigo-300 text-indigo-800',
};

const STATUS_LABELS = {
  'BASE': 'Na Base',
  'MOBILIZANDO': 'Mobilizando',
  'EM_DESLOCAMENTO': 'Em Deslocamento',
  'AGUARDANDO_EMBARQUE': 'Aguardando Embarque',
  'EMBARCADO': 'Embarcado',
  'FOLGA': 'De Folga',
};

export default function CheckinWidget({ employeeId, api, onStatusChange }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);
  
  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await api.checkin.getStatus(employeeId);
      setStatus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) loadStatus();
  }, [employeeId]);

  const handleAction = async () => {
    try {
      setLoading(true);
      
      // Tentar pegar geo com timeout
      let geo = null;
      if (navigator.geolocation) {
        geo = await new Promise((resolve) => {
          let resolved = false;
          const to = setTimeout(() => {
             if (resolved) return;
             resolved = true;
             resolve(null);
          }, 8000); // 8s timeout
          
          navigator.geolocation.getCurrentPosition((pos) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(to);
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          }, (err) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(to);
            resolve(null);
          });
        });
      }

      const res = await api.checkin.doCheckin(employeeId, { to_status: confirming, geo });
      
      if (onStatusChange) onStatusChange(res.current_status);
      setConfirming(null);
      await loadStatus();
    } catch (e) {
      console.error(e);
      alert('Erro ao realizar checkin. Tente novamente.');
      setConfirming(null);
      setLoading(false);
    }
  };

  if (loading && !status) return <div className="p-4 text-center text-slate-500">Carregando status...</div>;
  if (!status) return null;

  const current = status.current_status || 'BASE';
  const colorClass = STATUS_COLORS[current] || STATUS_COLORS['BASE'];
  
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-bold text-slate-800">Status & Check-in</h3>
      
      <div className={`mb-4 flex items-center justify-between rounded-lg border p-3 ${colorClass}`}>
        <span className="font-semibold">{STATUS_LABELS[current] || current}</span>
        <div className="text-xs opacity-70">
           {status.status_updated_at ? new Date(status.status_updated_at).toLocaleString('pt-BR') : ''}
        </div>
      </div>

      {current !== 'EMBARCADO' && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>A criação de OS e RDO só é liberada após confirmar o embarque na unidade.</p>
        </div>
      )}

      {status.next_allowed && status.next_allowed.length > 0 && (
        <div className="space-y-2">
          {status.next_allowed.map(nextTarget => {
             const label = STATUS_LABELS[nextTarget] || nextTarget;
             return (
               <div key={nextTarget}>
                 {confirming === nextTarget ? (
                   <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                     <p className="mb-3 text-sm font-medium text-blue-900">
                        Confirmar transição para <strong>{label}</strong>?<br/>
                        <span className="text-xs font-normal">Sua localização (GPS) será capturada.</span>
                     </p>
                     <div className="flex gap-2">
                       <button 
                         onClick={() => setConfirming(null)}
                         className="flex-1 rounded-lg bg-white py-2 text-sm font-semibold text-slate-700 border border-slate-300"
                         disabled={loading}
                       >
                         Cancelar
                       </button>
                       <button 
                         onClick={handleAction}
                         className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white"
                         disabled={loading}
                       >
                         Confirmar
                       </button>
                     </div>
                   </div>
                 ) : (
                   <button 
                     className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-slate-50 p-3 hover:bg-slate-100 transition-colors"
                     onClick={() => setConfirming(nextTarget)}
                     disabled={loading}
                   >
                     <span className="font-semibold text-slate-700">Fazer Check-in: {label}</span>
                     <ArrowRight className="h-5 w-5 text-slate-400" />
                   </button>
                 )}
               </div>
             )
          })}
        </div>
      )}
    </div>
  );
}
