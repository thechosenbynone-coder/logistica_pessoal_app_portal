import React, { useCallback, useEffect, useState } from 'react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import apiService from '../../services/api';
import DeploymentCard from './DeploymentCard';
import DeploymentDetailModal from './DeploymentDetailModal';
import DeploymentFormModal from './DeploymentFormModal';

const columns = ['PLANEJADO', 'CONFIRMADO', 'DOCS_OK', 'EMBARCADO', 'CONCLUIDO'];
const nextStatus = { PLANEJADO: 'CONFIRMADO', CONFIRMADO: 'DOCS_OK', DOCS_OK: 'EMBARCADO', EMBARCADO: 'CONCLUIDO' };

export default function MobilityPage() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const load = useCallback(async () => setItems(await apiService.deployments.list()), []);
  useEffect(() => { load(); }, [load]);
  const advance = async (d) => { const target = nextStatus[d.status]; if (!target) return; await apiService.deployments.updateStatus(d.id, target); load(); };

  return <div className="space-y-4"><Card className="p-4 flex justify-between"><h1 className="text-xl font-semibold">Kanban de Escalas</h1><Button onClick={() => setOpenForm(true)}>Novo</Button></Card><div className="grid grid-cols-1 md:grid-cols-5 gap-3">{columns.map((col) => <Card key={col} className="p-3"><h3 className="font-semibold text-sm mb-2">{col}</h3><div className="space-y-2">{items.filter((i) => i.status === col).map((d) => <DeploymentCard key={d.id} deployment={d} onOpen={setSelected} onAdvance={advance} />)}</div></Card>)}</div><DeploymentDetailModal open={!!selected} deployment={selected} onClose={() => setSelected(null)} /><DeploymentFormModal open={openForm} onClose={() => setOpenForm(false)} onCreate={async (payload) => { await apiService.deployments.create(payload); setOpenForm(false); load(); }} /></div>;
}
