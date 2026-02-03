import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UserCircle2 } from 'lucide-react';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import EmployeeProfile from './EmployeeProfile';
import { buildMinimalCollaborators, computeDashboardMetrics, parseXlsxToDataset } from '../../services/portalXlsxImporter';

function digitsOnly(s) {
  return (s || '').toString().replace(/\D/g, '');
}

function docTone(d) {
  if ((d?.expired || 0) > 0) return { label: 'Vencido', tone: 'red' };
  if ((d?.warning || 0) > 0) return { label: 'Atenção', tone: 'amber' };
  return { label: 'OK', tone: 'green' };
}

function equipTone(e) {
  if ((e?.pendingReturn || 0) > 0) return { label: 'Pendência', tone: 'amber' };
  return { label: 'OK', tone: 'green' };
}

// Normaliza para o novo domínio (base/unit), mantendo compatibilidade com dados antigos (hub/client).
function normalizeEmployee(e) {
  if (!e) return e;
  const base = e.base ?? e.hub ?? '';
  const unit = e.unit ?? e.client ?? '';
  return { ...e, base, unit };
}

export default function EmployeesPage({ employees = [], focusEmployee, focus, onFocusHandled }) {
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(employees?.[0]?.id || null);
  const [initialTab, setInitialTab] = useState('overview');
  const fileInputRef = useRef(null);

  const focusId = focusEmployee?.employeeId ?? focus?.employeeId;
  const focusTab = focusEmployee?.tab ?? focus?.tab;

  const normalized = useMemo(() => employees.map(normalizeEmployee), [employees]);

  useEffect(() => {
    // keep selection valid when employees list changes
    if (!normalized?.length) {
      setSelectedId(null);
      return;
    }
    const exists = normalized.some((e) => e.id === selectedId);
    if (!exists) setSelectedId(normalized[0].id);
  }, [normalized, selectedId]);

  useEffect(() => {
    if (!focusId) return;
    setSelectedId(focusId);
    setInitialTab(focusTab || 'overview');
    onFocusHandled?.();
  }, [focusId, focusTab, onFocusHandled]);

  const filtered = useMemo(() => {
    const qt = q.trim().toLowerCase();
    const qd = digitsOnly(q);
    if (!qt && !qd) return normalized;
    return normalized.filter((e) => {
      const name = (e.name || '').toLowerCase();
      const cpf = digitsOnly(e.cpf);
      return (qt && name.includes(qt)) || (qd && cpf.includes(qd));
    });
  }, [normalized, q]);

  const selected = useMemo(() => normalized.find((e) => e.id === selectedId), [normalized, selectedId]);

  async function handleXlsxImport(file) {
    if (!file) return;
    try {
      const dataset = await parseXlsxToDataset(file);
      const metrics = computeDashboardMetrics(dataset);
      const importedAt = new Date().toISOString();
      try {
        window.localStorage.setItem('portal_rh_xlsx_v1', JSON.stringify({ version: 1, importedAt, dataset, metrics }));
        window.dispatchEvent(new Event('portal_rh_xlsx_updated'));
        return;
      } catch (storageErr) {
        try {
          const colaboradores_minimos = buildMinimalCollaborators(dataset.colaboradores);
          window.localStorage.setItem(
            'portal_rh_xlsx_v1',
            JSON.stringify({ version: 1, importedAt, metrics, colaboradores_minimos })
          );
          window.dispatchEvent(new Event('portal_rh_xlsx_updated'));
        } catch (fallbackErr) {
          console.error('Falha ao salvar dados XLSX no navegador.', fallbackErr);
        }
      }
    } catch (err) {
      console.error('Falha ao importar planilha XLSX.', err);
    }
  }

  return (
    <div className="p-6 grid grid-cols-12 gap-6">
      <div className="col-span-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold">Colaboradores</div>
            <div className="text-sm text-slate-500">Selecione um colaborador para ver os detalhes</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                fileInputRef.current?.click();
              }}
            >
              Importar Planilha (.xlsx)
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (e.target) e.target.value = '';
                handleXlsxImport(file);
              }}
            />
          </div>
        </div>

        <Card className="p-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou CPF" />
        </Card>

        <div className="space-y-2">
          {filtered.map((e) => {
            const isActive = e.id === selectedId;
            const d = docTone(e.docs);
            const eq = equipTone(e.equipment);
            return (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className={
                  'w-full text-left rounded-xl border p-3 transition-colors ' +
                  (isActive ? 'border-blue-200 bg-blue-50' : 'border-slate-200 hover:bg-slate-50')
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      <UserCircle2 size={18} className="text-slate-400" />
                      {e.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {e.cpf || 'CPF não informado'} • {e.role || 'Função'} • {e.base || 'Base'}
                    </div>
                    {!!e.unit && <div className="text-[11px] text-slate-400 mt-1">Unidade: {e.unit}</div>}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge tone={d.tone}>{d.label}</Badge>
                    <Badge tone={eq.tone}>{eq.label}</Badge>
                  </div>
                </div>
              </button>
            );
          })}

          {!filtered.length && (
            <Card className="p-6 text-center text-sm text-slate-500">Nenhum colaborador encontrado.</Card>
          )}
        </div>
      </div>

      <div className="col-span-7">
        {selected ? (
          <EmployeeProfile employee={selected} initialTab={initialTab} />
        ) : (
          <Card className="p-8 text-center text-slate-500">
            Selecione um colaborador para visualizar detalhes.
          </Card>
        )}
      </div>
    </div>
  );
}
