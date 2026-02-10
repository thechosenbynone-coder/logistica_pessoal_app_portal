import React, { useEffect, useMemo, useState } from 'react';
import { HardHat } from 'lucide-react';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import EmployeeProfile from '../employees/EmployeeProfile';
import EmployeePickerModal from '../../components/EmployeePickerModal';

function digitsOnly(s) {
  return (s || '').toString().replace(/\D/g, '');
}

function epiStatus(e) {
  const pending = e.equipment?.pendingReturn ?? 0;
  return pending > 0 ? 'Pendência' : 'OK';
}

export default function EquipmentPage({ employees = [] }) {
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(employees[0]?.id ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!selectedId && employees.length) setSelectedId(employees[0].id);
    if (selectedId && employees.length && !employees.some((e) => e.id === selectedId)) {
      setSelectedId(employees[0].id);
    }
  }, [employees, selectedId]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const dig = digitsOnly(q);
    if (!query && !dig) return employees;
    return employees.filter((e) => {
      const nameOk = query ? (e.name || '').toLowerCase().includes(query) : false;
      const cpfOk = dig ? digitsOnly(e.cpf).includes(dig) : false;
      return nameOk || cpfOk;
    });
  }, [employees, q]);

  const selected = useMemo(() => employees.find((e) => e.id === selectedId) ?? null, [employees, selectedId]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <EmployeePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        employees={employees}
        title="Gerar nova ficha de EPI"
        hint="Digite nome ou CPF"
        onSelect={(emp) => setSelectedId(emp.id)}
      />

      <Card className="p-6 lg:col-span-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-slate-100">EPIs e Equipamentos</div>
            <div className="text-sm text-slate-400">Selecione um colaborador para abrir a ficha.</div>
          </div>
          <HardHat />
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={() => setPickerOpen(true)}>Nova ficha de EPI</Button>
        </div>

        <div className="mt-4">
          <Input placeholder="Buscar por nome ou CPF" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="mt-4 space-y-2">
          {filtered.map((e) => {
            const active = e.id === selectedId;
            return (
              <button
                key={e.id}
                type="button"
                className={
                  'w-full rounded-2xl border p-3 text-left hover:bg-slate-900/70 ' +
                  (active ? 'border-blue-500/60 bg-blue-500/10' : 'border-slate-700/50 bg-slate-900/40')
                }
                onClick={() => setSelectedId(e.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-100">{e.name}</div>
                    <div className="text-xs font-mono text-slate-400">{e.cpf} • {e.role} • {e.hub}</div>
                  </div>
                  <Badge tone={epiStatus(e) === 'OK' ? 'green' : 'yellow'}>{epiStatus(e)}</Badge>
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && <div className="text-sm text-slate-400">Nenhum colaborador encontrado.</div>}
        </div>
      </Card>

      <Card className="p-6 lg:col-span-2">
        {!selected ? (
          <div className="text-sm text-slate-400">Selecione um colaborador para visualizar a ficha.</div>
        ) : (
          <EmployeeProfile employee={selected} initialTab="equipment" />
        )}
      </Card>
    </div>
  );
}
