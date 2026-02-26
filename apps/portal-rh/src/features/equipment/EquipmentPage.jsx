import React, { useState } from 'react';
import Card from '../../ui/Card';
import Input from '../../ui/Input';
import EquipmentTab from './EquipmentTab';
import EpiStockTab from './EpiStockTab';
import EpiPendenciasTab from './EpiPendenciasTab';

export default function EquipmentPage() {
  const [tab, setTab] = useState('pendencias');
  const [employeeId, setEmployeeId] = useState('');
  const employee = { id: Number(employeeId || 0), name: `Colaborador ${employeeId}` };

  return <div className="space-y-4"><Card className="p-4"><h1 className="text-xl font-semibold">EPIs</h1><div className="mt-3 flex gap-2">{['pendencias', 'estoque', 'ficha'].map((t) => <button key={t} className={`px-3 py-1 rounded ${tab===t?'bg-slate-900 text-white':'bg-slate-100'}`} onClick={() => setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>)}</div></Card>{tab === 'pendencias' && <EpiPendenciasTab />}{tab === 'estoque' && <EpiStockTab />}{tab === 'ficha' && <Card className="p-4 space-y-3"><Input placeholder="Employee ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />{employee.id > 0 ? <EquipmentTab employee={employee} /> : <p className="text-sm">Informe o colaborador.</p>}</Card>}</div>;
}
