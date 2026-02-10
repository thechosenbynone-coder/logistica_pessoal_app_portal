import React, { useEffect, useMemo, useState } from 'react';
import { UserCircle2, Search, RefreshCw } from 'lucide-react';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import EmployeeProfile from './EmployeeProfile';
import api from '../../services/api';

// Funções visuais
function docTone(d) {
  const suffix = d?.evidencePending ? ' •' : '';
  if ((d?.missing || 0) > 0 || (d?.expired || 0) > 0) return { label: `Vencido${suffix}`, tone: 'red' };
  if ((d?.warning || 0) > 0) return { label: `Atenção${suffix}`, tone: 'amber' };
  return { label: `OK${suffix}`, tone: 'green' };
}

function equipTone(e) {
  if ((e?.pendingReturn || 0) > 0) return { label: 'Pendência', tone: 'amber' };
  return { label: 'OK', tone: 'green' };
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [initialTab, setInitialTab] = useState('overview');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.employees.list();
      setEmployees(data);
    } catch (err) {
      console.error("Erro:", err);
      setError('Falha na conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return employees.filter((e) =>
      (e.name || '').toLowerCase().includes(s) ||
      (e.registration || '').toLowerCase().includes(s) ||
      (e.cpf || '').includes(s)
    );
  }, [employees, search]);

  const selected = useMemo(() => employees.find((e) => e.id === selectedId), [employees, selectedId]);

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-100px)]">
      <div className="col-span-5 flex flex-col gap-4 h-full">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={20} />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-10" />
          </div>
          <Button variant="secondary" onClick={loadData}><RefreshCw size={20} className={loading ? "animate-spin" : ""} /></Button>
        </div>
        {loading && <div className="text-center text-sm text-slate-500">Carregando...</div>}
        {error && <div className="text-center text-sm text-red-500">{error}</div>}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 pb-10">
          {!loading && !error && filtered.map((e) => {
            const d = e.docs ? docTone(e.docs) : { label: '-', tone: 'gray' };
            const isSelected = selectedId === e.id;
            return (
              <button key={e.id} onClick={() => setSelectedId(e.id)} className={`w-full text-left p-3 rounded-2xl border border-slate-700/50 transition-all bg-slate-900/40 backdrop-blur-md shadow-2xl ${isSelected ? 'border-l-4 border-l-blue-500' : ''}`}>
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-100 flex items-center gap-2">
                      <UserCircle2 size={18} /> {e.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 font-mono">{e.role} • {e.opStatus}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {(!e.gate || e.gate.level === 'APTO') && <Badge tone={d.tone}>{d.label}</Badge>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="col-span-7 h-full overflow-hidden rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-700/50 p-2 shadow-2xl transition-all">
        {selected ? <EmployeeProfile employee={selected} initialTab={initialTab} /> : <div className="h-full flex items-center justify-center text-slate-400 border border-slate-700/50 rounded-2xl">Selecione um colaborador</div>}
      </div>
    </div>
  );
}
