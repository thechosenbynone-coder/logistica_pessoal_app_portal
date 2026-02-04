import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UserCircle2 } from 'lucide-react';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import EmployeeProfile from './EmployeeProfile';
import { buildMinimalCollaborators, computeDashboardMetrics, parseXlsxToDataset } from '../../services/portalXlsxImporter';
import {
  REQUIRED_DOC_TYPES,
  docValidityStatus,
  evidenceStatus,
  normalizeDigitsOnly,
  normalizeDocType,
  normalizeText
} from '../../lib/documentationUtils';
import { mergePortalPayload, readPortalPayload, writePortalPayload } from '../../lib/portalStorage';
import { isDemoMode } from '../../services/demoMode';

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

// Normaliza para o novo domínio (base/unit), mantendo compatibilidade com dados antigos (hub/client).
function normalizeEmployee(e) {
  if (!e) return e;
  const base = e.base ?? e.hub ?? '';
  const unit = e.unit ?? e.client ?? '';
  return { ...e, base, unit };
}

function toImportedEmployees(payload) {
  const rows =
    payload?.colaboradores_minimos ||
    payload?.colaboradores ||
    payload?.dataset?.colaboradores_minimos ||
    payload?.dataset?.colaboradores;
  if (!Array.isArray(rows)) return null;
  return rows.map((row, index) => {
    const id = row.COLABORADOR_ID || row.id || row.cpf || row.CPF || `import_${index}`;
    const name = row.NOME_COMPLETO || row.nome || row.name || '';
    const cpf = row.CPF || row.cpf || '';
    const role = row.CARGO_FUNCAO || row.CARGO || row.cargo || row.role || '—';
    const base = row.BASE_OPERACIONAL || row.base || row.hub || '—';
    const unit = row.UNIDADE || row.unidade || row.unit || row.client || '';
    const status = row.STATUS_ATUAL || row.STATUS || row.status || '';
    const offshore = row.FUNCAO_OFFSHORE || row.offshore || '';
    return {
      id,
      name,
      nome: name,
      cpf,
      role,
      cargo: role,
      base,
      unit,
      unidade: unit,
      hub: base,
      client: unit,
      status,
      offshore,
      docs: { valid: 0, warning: 0, expired: 0 },
      equipment: { assigned: 0, pendingReturn: 0 },
      nextDeployment: null,
      finance: {
        status: '—',
        note: '',
        bank: '—',
        pix: '—',
        lastPayment: null,
        lastAmount: null,
        notes: ''
      }
    };
  });
}

function loadImportedEmployees() {
  const payload = readPortalPayload();
  const employees = toImportedEmployees(payload);
  const documentacoes = Array.isArray(payload?.dataset?.documentacoes) ? payload.dataset.documentacoes : [];
  return { employees, documentacoes };
}

function summarizeEmployeeDocs(documentacoes, employeeId) {
  if (!Array.isArray(documentacoes) || documentacoes.length === 0 || !employeeId) return null;
  const id = normalizeText(employeeId);
  const docsForEmployee = documentacoes.filter((doc) => normalizeText(doc.COLABORADOR_ID) === id);
  if (!docsForEmployee.length) {
    return {
      valid: 0,
      warning: 0,
      expired: 0,
      missing: REQUIRED_DOC_TYPES.length,
      evidencePending: false
    };
  }
  let valid = 0;
  let warning = 0;
  let expired = 0;
  let missing = 0;
  let evidencePending = false;
  REQUIRED_DOC_TYPES.forEach((type) => {
    const docsOfType = docsForEmployee.filter((doc) => normalizeDocType(doc.TIPO_DOCUMENTO) === type);
    if (!docsOfType.length) {
      missing += 1;
      return;
    }
    const doc = docsOfType[0];
    const status = docValidityStatus(doc);
    if (status === 'VENCIDO') expired += 1;
    if (status === 'VENCENDO') warning += 1;
    if (status === 'OK') valid += 1;
    const evidence = evidenceStatus(doc);
    if (evidence !== 'VERIFICADO') evidencePending = true;
  });
  return { valid, warning, expired, missing, evidencePending };
}

export default function EmployeesPage({ employees = [], focusEmployee, focus, onFocusHandled }) {
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(employees?.[0]?.id || null);
  const [initialTab, setInitialTab] = useState('overview');
  const fileInputRef = useRef(null);
  const [importedEmployees, setImportedEmployees] = useState(null);
  const [storedDocumentacoes, setStoredDocumentacoes] = useState([]);
  const demoMode = isDemoMode();

  const focusId = focusEmployee?.employeeId ?? focus?.employeeId;
  const focusTab = focusEmployee?.tab ?? focus?.tab;

  useEffect(() => {
    const stored = loadImportedEmployees();
    setImportedEmployees(stored.employees);
    setStoredDocumentacoes(stored.documentacoes);
    const handleUpdate = () => {
      const updated = loadImportedEmployees();
      setImportedEmployees(updated.employees);
      setStoredDocumentacoes(updated.documentacoes);
    };
    window.addEventListener('portal_rh_xlsx_updated', handleUpdate);
    return () => {
      window.removeEventListener('portal_rh_xlsx_updated', handleUpdate);
    };
  }, []);

  const employeesEffective = importedEmployees ?? employees;
  const normalized = useMemo(() => employeesEffective.map(normalizeEmployee), [employeesEffective]);
  const enriched = useMemo(
    () =>
      normalized.map((emp) => {
        const summary = summarizeEmployeeDocs(storedDocumentacoes, emp.id);
        if (!summary) return emp;
        return { ...emp, docs: { ...emp.docs, ...summary } };
      }),
    [normalized, storedDocumentacoes]
  );

  useEffect(() => {
    // keep selection valid when employees list changes
    if (!enriched?.length) {
      setSelectedId(null);
      return;
    }
    const exists = enriched.some((e) => e.id === selectedId);
    if (!exists) setSelectedId(enriched[0].id);
  }, [enriched, selectedId]);

  useEffect(() => {
    if (!focusId) return;
    setSelectedId(focusId);
    setInitialTab(focusTab || 'overview');
    onFocusHandled?.();
  }, [focusId, focusTab, onFocusHandled]);

  const filtered = useMemo(() => {
    const qt = q.trim().toLowerCase();
    const qd = normalizeDigitsOnly(q);
    if (!qt && !qd) return enriched;
    return enriched.filter((e) => {
      const name = (e.name || '').toLowerCase();
      const cpf = normalizeDigitsOnly(e.cpf);
      return (qt && name.includes(qt)) || (qd && cpf.includes(qd));
    });
  }, [enriched, q]);

  const selected = useMemo(() => enriched.find((e) => e.id === selectedId), [enriched, selectedId]);

  async function handleXlsxImport(file) {
    if (!file) return;
    try {
      const dataset = await parseXlsxToDataset(file);
      const prevPayload = readPortalPayload();
      const nextDataset = { ...prevPayload.dataset, ...dataset };
      if (!Array.isArray(nextDataset.documentacoes) && Array.isArray(prevPayload.dataset?.documentacoes)) {
        nextDataset.documentacoes = prevPayload.dataset.documentacoes;
      }
      if (!Array.isArray(nextDataset.colaboradores) || nextDataset.colaboradores.length === 0) {
        nextDataset.colaboradores = prevPayload.dataset?.colaboradores || [];
      }
      const colaboradores_minimos = buildMinimalCollaborators(nextDataset.colaboradores);
      const metrics = computeDashboardMetrics(nextDataset);
      const importedAt = new Date().toISOString();
      const payload = mergePortalPayload(prevPayload, {
        importedAt,
        dataset: nextDataset,
        metrics,
        colaboradores_minimos:
          colaboradores_minimos.length > 0
            ? colaboradores_minimos
            : prevPayload.colaboradores_minimos || prevPayload.dataset?.colaboradores_minimos || []
      });
      try {
        writePortalPayload(payload);
        return;
      } catch (storageErr) {
        try {
          writePortalPayload(
            mergePortalPayload(prevPayload, {
              importedAt,
              metrics,
              colaboradores_minimos:
                colaboradores_minimos.length > 0
                  ? colaboradores_minimos
                  : prevPayload.colaboradores_minimos || prevPayload.dataset?.colaboradores_minimos || []
            })
          );
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
            {!demoMode && (
              <>
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
              </>
            )}
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
