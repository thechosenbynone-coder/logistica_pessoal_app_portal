import React, { useMemo, useState } from 'react';
import { CalendarClock, ClipboardList, FileText, HardHat, Users } from 'lucide-react';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import EmployeePickerModal from '../../components/EmployeePickerModal';

function countDocsStatus(e) {
  const expired = e.docs?.expired ?? 0;
  const warning = e.docs?.warning ?? 0;
  if (expired > 0) return 'Vencido';
  if (warning > 0) return 'Atenção';
  return 'OK';
}

function formatDeployment(dep) {
  if (!dep) return 'Sem embarque';
  const parts = [dep.destination, dep.embarkDate, dep.transport].filter(Boolean);
  return parts.join(' • ');
}

export default function DashboardPage({ employees = [], onOpenEmployee }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState('overview');

  const openPicker = (tabKey) => {
    setPickerTab(tabKey);
    setPickerOpen(true);
  };

  const summary = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.status === 'ATIVO').length;
    const docsAttention = employees.filter((e) => countDocsStatus(e) !== 'OK').length;
    const epiPending = employees.filter((e) => (e.equipment?.pendingReturn ?? 0) > 0).length;
    return { total, active, docsAttention, epiPending };
  }, [employees]);

  const nextDeployments = useMemo(() => {
    return employees
      .filter((e) => e.nextDeployment)
      .slice()
      .sort((a, b) =>
        (a.nextDeployment?.embarkDate || '').localeCompare(b.nextDeployment?.embarkDate || '')
      )
      .slice(0, 5);
  }, [employees]);

  return (
    <div className="space-y-6">
      <EmployeePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        employees={employees}
        title="Selecione o colaborador"
        onSelect={(emp) => onOpenEmployee?.(emp.id, pickerTab)}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Colaboradores</div>
              <div className="text-2xl font-semibold text-slate-900">{summary.total}</div>
              <div className="mt-1 text-xs text-slate-500">{summary.active} ativos</div>
            </div>
            <Users />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Docs em atenção</div>
              <div className="text-2xl font-semibold text-slate-900">{summary.docsAttention}</div>
              <div className="mt-1 text-xs text-slate-500">vencidos / atenção</div>
            </div>
            <FileText />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Pendências de EPI</div>
              <div className="text-2xl font-semibold text-slate-900">{summary.epiPending}</div>
              <div className="mt-1 text-xs text-slate-500">devolução / troca</div>
            </div>
            <HardHat />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Próximos embarques</div>
              <div className="text-2xl font-semibold text-slate-900">{nextDeployments.length}</div>
              <div className="mt-1 text-xs text-slate-500">nos próximos dias</div>
            </div>
            <CalendarClock />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-slate-900">Atalhos rápidos</div>
              <div className="text-sm text-slate-500">Selecione o colaborador antes de abrir o módulo.</div>
            </div>
            <ClipboardList />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => openPicker('overview')}>Abrir perfil</Button>
            <Button variant="secondary" onClick={() => openPicker('equipment')}>
              EPIs e Equipamentos
            </Button>
            <Button variant="secondary" onClick={() => openPicker('docs')}>
              Documentação
            </Button>
            <Button variant="secondary" onClick={() => openPicker('mobility')}>
              Escalas & Embarques
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-lg font-semibold text-slate-900">Próximos embarques</div>
          <div className="mt-1 text-sm text-slate-500">Top 5 por data</div>

          <div className="mt-4 space-y-3">
            {nextDeployments.length === 0 ? (
              <div className="text-sm text-slate-500">Sem embarques cadastrados.</div>
            ) : (
              nextDeployments.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className="w-full rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"
                  onClick={() => onOpenEmployee?.(e.id, 'mobility')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{e.name}</div>
                      <div className="text-xs text-slate-500">{formatDeployment(e.nextDeployment)}</div>
                    </div>
                    <Badge tone="gray">Ver</Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
