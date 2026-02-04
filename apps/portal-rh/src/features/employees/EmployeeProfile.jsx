import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  FileText,
  HardHat,
  Truck,
  UserCircle2,
  Wallet
} from 'lucide-react';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import EquipmentTab from '../equipment/EquipmentTab';
import EmbarqueEscalaTab from '../mobility/EmbarqueEscalaTab';
import FinanceTab from '../finance/FinanceTab';
import EmployeeDocsTab from './EmployeeDocsTab';

function formatCPF(cpf) {
  if (!cpf) return '';
  const digits = cpf.replace(/\D/g, '').slice(0, 11);
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatDeployment(dep) {
  if (!dep) return 'Sem embarque';
  return `${dep.destination} • ${dep.embarkDate}`;
}

// Normaliza para o novo domínio (base/unit), mantendo compatibilidade com dados antigos (hub/client).
function normalizeEmployee(e) {
  if (!e) return e;
  const base = e.base ?? e.hub ?? '';
  const unit = e.unit ?? e.client ?? '';
  return { ...e, base, unit };
}

export default function EmployeeProfile({ employee, initialTab = 'overview' }) {
  const emp = useMemo(() => normalizeEmployee(employee), [employee]);

  const tabs = useMemo(
    () => [
      { key: 'overview', label: 'Abrir Perfil', icon: UserCircle2 },
      { key: 'equipment', label: 'EPIs e Equipamentos', icon: HardHat },
      { key: 'docs', label: 'Documentação', icon: FileText },
      { key: 'requests', label: 'Solicitações', icon: ClipboardList },
      { key: 'mobility', label: 'Escala e Embarque', icon: Truck },
      { key: 'finance', label: 'Financeiro', icon: Wallet }
    ],
    []
  );

  const [currentTab, setCurrentTab] = useState(initialTab);

  useEffect(() => {
    setCurrentTab(initialTab || 'overview');
  }, [initialTab]);

  if (!emp) {
    return (
      <Card className="p-6">
        <div className="text-sm text-slate-500">Selecione um colaborador.</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">{emp.name}</div>
            <div className="text-sm text-slate-500">
              {emp.role} • CPF: {formatCPF(emp.cpf)}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="gray">{emp.base || 'Base —'}</Badge>
              <Badge tone="gray">{emp.unit || 'Unidade —'}</Badge>
              <Badge tone={emp.status === 'ATIVO' ? 'green' : 'gray'}>{emp.status}</Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Próximo embarque</div>
            <div className="text-sm font-medium text-slate-900">{formatDeployment(emp.nextDeployment)}</div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = currentTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setCurrentTab(t.key)}
                className={
                  'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ' +
                  (active
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')
                }
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>
      </Card>

      {currentTab === 'overview' && (
        <Card className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <div className="text-xs text-slate-500">Documentos</div>
              <div className="mt-1 flex items-center gap-2">
                <Badge tone={emp.docs?.expired > 0 ? 'red' : emp.docs?.warning > 0 ? 'yellow' : 'green'}>
                  {emp.docs?.expired > 0 ? 'Vencido' : emp.docs?.warning > 0 ? 'Atenção' : 'OK'}
                </Badge>
                <div className="text-sm text-slate-700">
                  {emp.docs?.valid ?? 0} válidos • {emp.docs?.warning ?? 0} atenção • {emp.docs?.expired ?? 0}{' '}
                  vencidos
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">EPIs/Equipamentos</div>
              <div className="mt-1 flex items-center gap-2">
                <Badge tone={(emp.equipment?.pendingReturn ?? 0) > 0 ? 'yellow' : 'green'}>
                  {(emp.equipment?.pendingReturn ?? 0) > 0 ? 'Pendência' : 'OK'}
                </Badge>
                <div className="text-sm text-slate-700">
                  {emp.equipment?.assigned ?? 0} atribuídos • {emp.equipment?.pendingReturn ?? 0} pendente
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Financeiro</div>
              <div className="mt-1 flex items-center gap-2">
                <Badge tone={emp.finance?.status === 'OK' ? 'green' : 'yellow'}>
                  {emp.finance?.status || 'Em análise'}
                </Badge>
                <div className="text-sm text-slate-700">{emp.finance?.note || 'Sem apontamentos.'}</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {currentTab === 'equipment' && <EquipmentTab employee={emp} />}
      {currentTab === 'docs' && <EmployeeDocsTab employee={emp} />}
      {currentTab === 'requests' && (
        <Card className="p-6">
          <div className="text-sm text-slate-600">
            Aqui vão entrar as solicitações do colaborador (segunda via, troca de EPI, atualização cadastral, apoio de
            embarque, etc.).
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Status: <span className="font-medium">Em breve</span>
          </div>
        </Card>
      )}
      {currentTab === 'mobility' && <EmbarqueEscalaTab employee={emp} />}
      {currentTab === 'finance' && <FinanceTab employee={emp} />}
    </div>
  );
}
