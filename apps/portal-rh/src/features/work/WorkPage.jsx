import React, { useCallback, useEffect, useState } from 'react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import apiService from '../../services/api';
import ReviewModal from './ReviewModal';
import SemPreenchimentoTab from './SemPreenchimentoTab';

const statusList = ['Todos', 'PENDENTE', 'EM_REVISAO', 'APROVADO', 'REJEITADO', 'CORRECAO_SOLICITADA'];

export default function WorkPage() {
  const [tab, setTab] = useState('RDOs');
  const [status, setStatus] = useState('Todos');
  const [rdos, setRdos] = useState([]);
  const [oss, setOss] = useState([]);
  const [target, setTarget] = useState(null);

  const load = useCallback(async () => {
    const filter = status === 'Todos' ? {} : { approvalStatus: status };
    setRdos(await apiService.dailyReports.list(filter));
    setOss(await apiService.serviceOrders.list(filter));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const submitReview = async (payload) => {
    if (!target) return;
    if (target.type === 'rdo') await apiService.dailyReports.review(target.id, payload);
    else await apiService.serviceOrders.review(target.id, payload);
    setTarget(null);
    load();
  };

  const list = tab === 'RDOs' ? rdos : oss;
  return <div className="space-y-4"><Card className="p-4"><h1 className="text-xl font-semibold">Painel de Ação</h1><div className="flex gap-2 mt-2">{['RDOs','OSs','Sem Preenchimento'].map((t)=><button key={t} className={`px-3 py-1 rounded ${tab===t?'bg-slate-900 text-white':'bg-slate-100'}`} onClick={()=>setTab(t)}>{t}</button>)}</div><div className="flex gap-2 mt-2 flex-wrap">{statusList.map((s)=><button key={s} className={`px-2 py-1 rounded text-xs ${status===s?'bg-blue-600 text-white':'bg-slate-100'}`} onClick={()=>setStatus(s)}>{s}</button>)}</div></Card>{tab === 'Sem Preenchimento' ? <Card className="p-4"><SemPreenchimentoTab /></Card> : <Card className="p-4"><div className="space-y-2">{list.map((item) => <div key={item.id} className="border rounded p-2 flex justify-between"><span>{item.description || item.title} • {item.approval_status || 'PENDENTE'}</span><Button onClick={() => setTarget({ id: item.id, type: tab === 'RDOs' ? 'rdo' : 'os' })}>Revisar</Button></div>)}</div></Card>}<ReviewModal open={!!target} onClose={() => setTarget(null)} onSubmit={submitReview} /></div>;
}
