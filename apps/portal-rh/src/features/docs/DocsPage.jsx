import React, { useEffect, useMemo, useState } from 'react';
import { Paperclip } from 'lucide-react';
import Card from '../../ui/Card.jsx';
import Button from '../../ui/Button.jsx';
import Input from '../../ui/Input.jsx';
import Badge from '../../ui/Badge.jsx';
import api from '../../services/api';
import ModulePlaceholderPage from '../common/ModulePlaceholderPage.jsx';
import {
  OPTIONAL_DOC_TYPES,
  REQUIRED_DOC_TYPES,
  docValidityStatus,
  evidenceStatus,
  normalizeDocType,
  normalizeText
} from '../../lib/documentationUtils';

const ALL_DOC_TYPES = [...REQUIRED_DOC_TYPES, ...OPTIONAL_DOC_TYPES];

function mapStatusFromQuery(value) {
  if (value === 'expired') return 'VENCIDO';
  if (value === 'expiringSoon') return 'VENCENDO';
  return '';
}

function normalizeDocsResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.documents)) return data.documents;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function normalizeEmployeesResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.employees)) return data.employees;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function normalizeDocRow(row) {
  const normalized = {
    COLABORADOR_ID: normalizeText(row?.COLABORADOR_ID || row?.employeeId || row?.employee_id),
    TIPO_DOCUMENTO: normalizeText(row?.TIPO_DOCUMENTO || row?.documentType || row?.document_type || row?.type),
    DATA_EMISSAO: normalizeText(row?.DATA_EMISSAO || row?.issueDate || row?.issue_date),
    DATA_VENCIMENTO: normalizeText(row?.DATA_VENCIMENTO || row?.expirationDate || row?.expiration_date),
    EVIDENCIA_TIPO: normalizeText(row?.EVIDENCIA_TIPO || row?.evidenceType || row?.evidence_type),
    EVIDENCIA_REF: normalizeText(row?.EVIDENCIA_REF || row?.evidenceRef || row?.evidence_ref),
    OBS: normalizeText(row?.OBS || row?.notes),
    VERIFIED: Boolean(row?.VERIFIED ?? row?.verified ?? false),
    VERIFIED_BY: normalizeText(row?.VERIFIED_BY || row?.verifiedBy || row?.verified_by),
    VERIFIED_AT: normalizeText(row?.VERIFIED_AT || row?.verifiedAt || row?.verified_at)
  };

  if (!normalized.COLABORADOR_ID || !normalized.TIPO_DOCUMENTO) return null;
  return normalized;
}

function normalizeEmployeeRow(row) {
  return {
    id: normalizeText(row?.id || row?.COLABORADOR_ID),
    name: normalizeText(row?.name || row?.NOME_COMPLETO || row?.nome),
    nome: normalizeText(row?.name || row?.NOME_COMPLETO || row?.nome)
  };
}

function buildDocKey(doc) {
  return `${normalizeText(doc.COLABORADOR_ID)}::${normalizeDocType(doc.TIPO_DOCUMENTO)}`;
}

export default function DocsPage({ onOpenEmployee, search = '' }) {
  const [documentacoes, setDocumentacoes] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [evidenceFilter, setEvidenceFilter] = useState('');
  const [requiredOnly, setRequiredOnly] = useState(false);
  const [queryStatus, setQueryStatus] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(search || '');
    const statusParam = params.get('status') || '';
    setQueryStatus(statusParam);
    setStatusFilter(mapStatusFromQuery(statusParam));
  }, [search]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const [docsRes, employeesRes] = await Promise.all([
          api.documents.list(),
          api.employees.list()
        ]);

        if (!mounted) return;

        const docs = normalizeDocsResponse(docsRes)
          .map(normalizeDocRow)
          .filter(Boolean);
        const employees = normalizeEmployeesResponse(employeesRes)
          .map(normalizeEmployeeRow)
          .filter((row) => row.id);

        setDocumentacoes(docs);
        setColaboradores(employees);
      } catch (err) {
        if (!mounted) return;
        console.error('Falha ao carregar documentações.', err);
        setError('Falha ao carregar documentações.');
        setDocumentacoes([]);
        setColaboradores([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const shouldShowDuringDeploymentPlaceholder = queryStatus === 'duringDeployment';

  const employeesById = useMemo(() => {
    const map = new Map();
    colaboradores.forEach((row) => {
      const id = normalizeText(row.id);
      if (!id) return;
      map.set(id, row);
    });
    return map;
  }, [colaboradores]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documentacoes
      .filter((doc) => {
        const id = normalizeText(doc.COLABORADOR_ID);
        const collaborator = employeesById.get(id);
        const name = normalizeText(collaborator?.name || collaborator?.nome);
        const type = normalizeDocType(doc.TIPO_DOCUMENTO);
        if (q && !id.toLowerCase().includes(q) && !name.toLowerCase().includes(q) && !type.toLowerCase().includes(q)) {
          return false;
        }
        if (typeFilter && type !== normalizeDocType(typeFilter)) return false;
        if (statusFilter) {
          const status = docValidityStatus(doc);
          if (status !== statusFilter) return false;
        }
        if (evidenceFilter) {
          const evidence = evidenceStatus(doc);
          if (evidence !== evidenceFilter) return false;
        }
        if (requiredOnly && !REQUIRED_DOC_TYPES.includes(type)) return false;
        return true;
      })
      .sort((a, b) => {
        const order = { VENCIDO: 0, VENCENDO: 1, OK: 2 };
        const statusA = docValidityStatus(a) || 'OK';
        const statusB = docValidityStatus(b) || 'OK';
        const diff = (order[statusA] ?? 3) - (order[statusB] ?? 3);
        if (diff !== 0) return diff;
        const dateA = normalizeText(a.DATA_VENCIMENTO) || '9999-12-31';
        const dateB = normalizeText(b.DATA_VENCIMENTO) || '9999-12-31';
        return dateA.localeCompare(dateB);
      });
  }, [documentacoes, query, typeFilter, statusFilter, evidenceFilter, requiredOnly, employeesById]);

  const hasQueryStatusFilter = Boolean(queryStatus);

  const summaryCounts = useMemo(() => {
    const counts = { vencidos: 0, vencendo: 0, semEvidencia: 0, pendente: 0 };
    documentacoes.forEach((doc) => {
      const status = docValidityStatus(doc);
      if (status === 'VENCIDO') counts.vencidos += 1;
      if (status === 'VENCENDO') counts.vencendo += 1;
      const evidence = evidenceStatus(doc);
      if (evidence === 'SEM_EVIDENCIA') counts.semEvidencia += 1;
      if (evidence === 'PENDENTE_VERIFICACAO') counts.pendente += 1;
    });
    return counts;
  }, [documentacoes]);

  function applyFilter(type, value) {
    if (type === 'status') setStatusFilter(value);
    if (type === 'evidence') setEvidenceFilter(value);
  }

  if (shouldShowDuringDeploymentPlaceholder || (!loading && !documentacoes.length && hasQueryStatusFilter)) {
    return <ModulePlaceholderPage title="Documentações" />;
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">Documentações (Painel de Massa)</div>
            <div className="text-sm text-slate-500">Triagem de pendências por colaborador e tipo documental.</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50" onClick={() => applyFilter('status', 'VENCIDO')}>
            Vencidos ({summaryCounts.vencidos})
          </button>
          <button type="button" className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50" onClick={() => applyFilter('status', 'VENCENDO')}>
            Vencendo ({summaryCounts.vencendo})
          </button>
          <button type="button" className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50" onClick={() => applyFilter('evidence', 'SEM_EVIDENCIA')}>
            Sem evidência ({summaryCounts.semEvidencia})
          </button>
          <button type="button" className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50" onClick={() => applyFilter('evidence', 'PENDENTE_VERIFICACAO')}>
            Pendente verificação ({summaryCounts.pendente})
          </button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por colaborador, ID ou tipo" />
          <select className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Todos os tipos</option>
            {ALL_DOC_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="VENCIDO">Vencido</option>
            <option value="VENCENDO">Vencendo</option>
            <option value="OK">OK</option>
          </select>
          <select className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400" value={evidenceFilter} onChange={(e) => setEvidenceFilter(e.target.value)}>
            <option value="">Todas evidências</option>
            <option value="SEM_EVIDENCIA">Sem evidência</option>
            <option value="PENDENTE_VERIFICACAO">Pendente verificação</option>
            <option value="VERIFICADO">Verificado</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={requiredOnly} onChange={(e) => setRequiredOnly(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-200" />
            Somente obrigatórios
          </label>
        </div>

        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div className="mt-4 space-y-2">
          {loading && <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">Carregando documentações...</div>}

          {!loading && filtered.map((doc) => {
            const status = docValidityStatus(doc) || 'OK';
            const evidence = evidenceStatus(doc);
            const id = normalizeText(doc.COLABORADOR_ID);
            const collaborator = employeesById.get(id);
            const colabName = collaborator?.name || collaborator?.nome || `ID ${id}`;
            const docType = normalizeDocType(doc.TIPO_DOCUMENTO);
            const isRequired = REQUIRED_DOC_TYPES.includes(docType);
            return (
              <div key={buildDocKey(doc)} className="rounded-xl border border-slate-200 p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
                  <div className="md:col-span-2">
                    <div className="text-sm font-semibold text-slate-900">{colabName}</div>
                    <div className="text-xs text-slate-500">ID {id}</div>
                  </div>
                  <div className="md:col-span-1">
                    <div className="text-sm font-semibold text-slate-900">{doc.TIPO_DOCUMENTO}</div>
                    <div className="text-xs text-slate-500">{isRequired ? 'Obrigatório' : 'Opcional'}</div>
                  </div>
                  <div className="md:col-span-1">
                    <div className="text-xs text-slate-500">Vencimento</div>
                    <div className="text-sm text-slate-800">{doc.DATA_VENCIMENTO || '—'}</div>
                    <Badge tone={status === 'VENCIDO' ? 'red' : status === 'VENCENDO' ? 'amber' : 'green'}>{status}</Badge>
                  </div>
                  <div className="md:col-span-1">
                    <div className="text-xs text-slate-500">Evidência</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                      <Paperclip size={14} />
                      {evidence}
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <div className="text-xs text-slate-500">Verificação</div>
                    <Badge tone={doc.VERIFIED ? 'green' : 'gray'}>{doc.VERIFIED ? 'Verificado' : 'Pendente'}</Badge>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => onOpenEmployee?.(id, 'docs')}>
                    Abrir colaborador
                  </Button>
                </div>
              </div>
            );
          })}

          {!loading && !filtered.length && (
            <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">Nenhuma documentação encontrada.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
