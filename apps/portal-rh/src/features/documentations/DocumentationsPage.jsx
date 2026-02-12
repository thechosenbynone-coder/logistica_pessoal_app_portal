import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../ui/Card.jsx';
import Badge from '../../ui/Badge.jsx';
import Button from '../../ui/Button.jsx';
import Input from '../../ui/Input.jsx';
import api from '../../services/api';
import {
  REQUIRED_DOC_TYPES,
  computeDocumentStatus,
  normalizeDocType,
  normalizeText,
} from '../../lib/documentationUtils';
import DocumentationFormModal from './DocumentationFormModal.jsx';

function mapQueryStatus(value) {
  if (value === 'expired') return 'VENCIDO';
  if (value === 'expiringSoon') return 'VENCENDO';
  if (value === 'duringDeployment') return 'DURANTE_EMBARQUE';
  if (value === 'missing') return 'FALTANDO';
  return '';
}

function badgeTone(status) {
  if (status === 'VENCIDO') return 'red';
  if (status === 'VENCENDO' || status === 'DURANTE_EMBARQUE') return 'amber';
  if (status === 'FALTANDO') return 'gray';
  if (status === 'SEM_VALIDADE') return 'blue';
  return 'green';
}

function statusLabel(status) {
  const labels = {
    OK: 'OK',
    VENCIDO: 'Vencido',
    VENCENDO: 'Vencendo',
    DURANTE_EMBARQUE: 'Vence durante embarque',
    SEM_VALIDADE: 'Sem validade',
    FALTANDO: 'Faltando',
  };
  return labels[status] || status;
}

function getEvidenceStatus(doc) {
  const evidenceType = normalizeText(doc?.evidence_type || doc?.EVIDENCIA_TIPO);
  const evidenceRef = normalizeText(doc?.evidence_ref || doc?.EVIDENCIA_REF || doc?.file_url);
  if (!evidenceType && !evidenceRef) return 'SEM_EVIDENCIA';
  const verified = Boolean(doc?.verified ?? doc?.VERIFIED ?? false);
  if (!verified) return 'PENDENTE_VERIFICACAO';
  return 'VERIFICADO';
}

function getActiveDeploymentByEmployee(deployments) {
  const map = new Map();
  deployments.forEach((dep) => {
    if (dep.end_date_actual) return;
    const employeeId = normalizeText(dep.employee_id);
    if (!employeeId) return;
    map.set(employeeId, dep);
  });
  return map;
}

function getCurrentSearch() {
  return window.location.search || '';
}


function normalizeEmployeeRow(employee) {
  const base = employee?.base ?? employee?.hub ?? '';
  const unit = employee?.unit ?? employee?.client ?? '';
  return { ...employee, base, unit };
}

export default function DocumentationsPage({ onOpenEmployee }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [employees, setEmployees] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [baseFilter, setBaseFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [requiredOnly, setRequiredOnly] = useState(false);
  const [modalEmployeeId, setModalEmployeeId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState(getCurrentSearch());

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [employeeRows, typeRows, documentRows, deploymentRows] = await Promise.all([
        api.employees.list(),
        api.documentTypes.list(),
        api.documents.list(),
        api.deployments.list(),
      ]);
      setEmployees((employeeRows || []).map(normalizeEmployeeRow));
      setDocTypes(typeRows || []);
      setDocuments(documentRows || []);
      setDeployments(deploymentRows || []);
    } catch (err) {
      console.error('Falha ao carregar módulo de documentações.', err);
      setError('Não foi possível carregar as documentações. Tente novamente.');
      setEmployees([]);
      setDocTypes([]);
      setDocuments([]);
      setDeployments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const onPop = () => setSearch(getCurrentSearch());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const mappedStatus = mapQueryStatus(normalizeText(params.get('status')));
    const requiredOnlyFromQuery = normalizeText(params.get('requiredOnly')).toLowerCase() === 'true';
    setStatusFilter(mappedStatus);
    setRequiredOnly(requiredOnlyFromQuery);
  }, [search]);

  const typeById = useMemo(() => {
    const map = new Map();
    docTypes.forEach((row) => map.set(Number(row.id), row));
    return map;
  }, [docTypes]);

  const employeesById = useMemo(() => {
    const map = new Map();
    employees.forEach((row) => map.set(normalizeText(row.id), row));
    return map;
  }, [employees]);

  const activeDeploymentsByEmployee = useMemo(
    () => getActiveDeploymentByEmployee(deployments),
    [deployments]
  );

  const requiredCodes = useMemo(() => REQUIRED_DOC_TYPES.map(normalizeDocType), []);

  const documentRows = useMemo(
    () =>
      (documents || []).map((doc) => {
        const employee = employeesById.get(normalizeText(doc.employee_id));
        const docType = typeById.get(Number(doc.document_type_id));
        const deployment = activeDeploymentsByEmployee.get(normalizeText(doc.employee_id));
        const status = computeDocumentStatus({ doc, docType, deploymentActive: deployment });
        const code = normalizeDocType(docType?.code || docType?.name || doc.document_code);
        return {
          kind: 'document',
          id: `doc-${doc.id}`,
          employee,
          doc,
          docType,
          code,
          required: requiredCodes.includes(code),
          status,
          evidenceStatus: getEvidenceStatus(doc),
        };
      }),
    [activeDeploymentsByEmployee, documents, employeesById, requiredCodes, typeById]
  );

  const missingRows = useMemo(() => {
    const docsByEmployee = new Map();

    documentRows.forEach((row) => {
      const employeeId = normalizeText(row.doc.employee_id);
      if (!docsByEmployee.has(employeeId)) docsByEmployee.set(employeeId, new Set());
      docsByEmployee.get(employeeId).add(row.code);
    });

    const rows = [];
    employees.forEach((employee) => {
      const employeeId = normalizeText(employee.id);
      const present = docsByEmployee.get(employeeId) || new Set();
      requiredCodes.forEach((requiredCode) => {
        if (!present.has(requiredCode)) {
          rows.push({
            kind: 'missing',
            id: `missing-${employeeId}-${requiredCode}`,
            employee,
            doc: null,
            docType: { code: requiredCode, name: requiredCode, requires_expiration: true },
            code: requiredCode,
            required: true,
            status: 'FALTANDO',
            evidenceStatus: 'SEM_EVIDENCIA',
          });
        }
      });
    });

    return rows;
  }, [documentRows, employees, requiredCodes]);

  const rows = useMemo(() => [...documentRows, ...missingRows], [documentRows, missingRows]);

  const filteredRows = useMemo(() => {
    const q = normalizeText(query).toLowerCase();
    return rows.filter((row) => {
      const employee = row.employee || {};
      const fullText = [
        normalizeText(employee.name),
        normalizeText(employee.cpf),
        normalizeText(row.docType?.name),
        normalizeText(row.docType?.code),
      ]
        .join(' ')
        .toLowerCase();

      if (q && !fullText.includes(q)) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      if (baseFilter && normalizeText(employee.base) !== baseFilter) return false;
      if (unitFilter && normalizeText(employee.unit) !== unitFilter) return false;
      if (requiredOnly && !row.required) return false;
      return true;
    });
  }, [baseFilter, query, requiredOnly, rows, statusFilter, unitFilter]);

  const summary = useMemo(() => {
    const total = {
      vencidos: 0,
      vencendo: 0,
      duranteEmbarque: 0,
      faltando: 0,
      semEvidencia: 0,
      pendenteVerificacao: 0,
    };
    rows.forEach((row) => {
      if (row.status === 'VENCIDO') total.vencidos += 1;
      if (row.status === 'VENCENDO') total.vencendo += 1;
      if (row.status === 'DURANTE_EMBARQUE') total.duranteEmbarque += 1;
      if (row.status === 'FALTANDO') total.faltando += 1;
      if (row.kind === 'document' && row.evidenceStatus === 'SEM_EVIDENCIA') total.semEvidencia += 1;
      if (row.kind === 'document' && row.evidenceStatus === 'PENDENTE_VERIFICACAO') {
        total.pendenteVerificacao += 1;
      }
    });
    return total;
  }, [rows]);

  const bases = useMemo(
    () => [...new Set(employees.map((row) => normalizeText(row.base)).filter(Boolean))],
    [employees]
  );

  const units = useMemo(
    () => [...new Set(employees.map((row) => normalizeText(row.unit)).filter(Boolean))],
    [employees]
  );

  const handleSaveDocument = async (payload) => {
    try {
      setSaving(true);
      setSaveError('');
      await api.documents.create(payload);
      setModalEmployeeId('');
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Erro ao salvar documento.', err);
      setSaveError(err?.response?.data?.message || 'Não foi possível salvar o documento.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEmployee = (employeeId) => {
    if (!employeeId) return;
    if (typeof onOpenEmployee === 'function') {
      onOpenEmployee(employeeId, 'docs');
      return;
    }
    const next = `/colaboradores?employeeId=${encodeURIComponent(employeeId)}&tab=docs`;
    window.location.assign(next);
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Documentações</h1>
            <p className="text-sm text-slate-500">Status real de documentação por colaborador.</p>
          </div>
          <Button
            onClick={() => {
              setModalEmployeeId('');
              setIsModalOpen(true);
            }}
          >
            Adicionar documento
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">
          <div className="rounded-xl border border-slate-200 p-3"><div className="text-xs text-slate-500">Vencidos</div><div className="text-xl font-bold text-red-600">{summary.vencidos}</div></div>
          <div className="rounded-xl border border-slate-200 p-3"><div className="text-xs text-slate-500">Vencendo (30 dias)</div><div className="text-xl font-bold text-amber-600">{summary.vencendo}</div></div>
          <div className="rounded-xl border border-slate-200 p-3"><div className="text-xs text-slate-500">Vence durante embarque</div><div className="text-xl font-bold text-amber-600">{summary.duranteEmbarque}</div></div>
          <div className="rounded-xl border border-slate-200 p-3"><div className="text-xs text-slate-500">Faltando</div><div className="text-xl font-bold text-slate-700">{summary.faltando}</div></div>
          <div className="rounded-xl border border-slate-200 p-3"><div className="text-xs text-slate-500">Sem evidência</div><div className="text-xl font-bold text-slate-700">{summary.semEvidencia}</div></div>
          <div className="rounded-xl border border-slate-200 p-3"><div className="text-xs text-slate-500">Pendente verificação</div><div className="text-xl font-bold text-slate-700">{summary.pendenteVerificacao}</div></div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, CPF, tipo ou código" />
          <select className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="OK">OK</option>
            <option value="VENCIDO">Vencido</option>
            <option value="VENCENDO">Vencendo</option>
            <option value="DURANTE_EMBARQUE">Durante embarque</option>
            <option value="SEM_VALIDADE">Sem validade</option>
            <option value="FALTANDO">Faltando</option>
          </select>
          <select className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" value={baseFilter} onChange={(e) => setBaseFilter(e.target.value)}>
            <option value="">Todas as bases</option>
            {bases.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <select className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
            <option value="">Todas as unidades</option>
            {units.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={requiredOnly} onChange={(e) => setRequiredOnly(e.target.checked)} />
            Somente obrigatórios
          </label>
        </div>

        {loading && <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm text-slate-500">Carregando documentações...</div>}
        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>}

        {!loading && !error && filteredRows.length === 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm text-slate-500">Nenhum item de documentação encontrado.</div>
        )}

        {!loading && !error && filteredRows.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Colaborador</th>
                  <th className="py-2 pr-3">Base / Unidade</th>
                  <th className="py-2 pr-3">Documento</th>
                  <th className="py-2 pr-3">Validade</th>
                  <th className="py-2 pr-3">Evidência</th>
                  <th className="py-2 pr-3">Verificação</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-0">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const employeeId = normalizeText(row.employee?.id);
                  const evidenceType = row.doc?.evidence_type || '—';
                  const evidenceRef = row.doc?.evidence_ref || row.doc?.file_url || '—';
                  const isVerified = Boolean(row.doc?.verified ?? row.doc?.VERIFIED ?? false);
                  return (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-900">{row.employee?.name || 'Colaborador não encontrado'}</div>
                        <div className="text-xs text-slate-500">CPF: {row.employee?.cpf || '—'}</div>
                      </td>
                      <td className="py-3 pr-3 text-slate-700">{row.employee?.base || '—'} / {row.employee?.unit || '—'}</td>
                      <td className="py-3 pr-3 text-slate-700">{row.docType?.name || row.docType?.code || '—'}</td>
                      <td className="py-3 pr-3 text-slate-700">{row.doc?.expiration_date || '—'}</td>
                      <td className="py-3 pr-3 text-xs text-slate-600">{evidenceType} • {evidenceRef}</td>
                      <td className="py-3 pr-3">
                        {row.kind === 'missing' || !row.doc ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <Badge tone={isVerified ? 'green' : 'gray'}>
                            {isVerified ? 'Verificado' : 'Pendente'}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 pr-3"><Badge tone={badgeTone(row.status)}>{statusLabel(row.status)}</Badge></td>
                      <td className="py-3 pr-0">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setModalEmployeeId(employeeId);
                              setIsModalOpen(true);
                            }}
                          >
                            Adicionar/Atualizar
                          </Button>
                          <Button variant="secondary" onClick={() => handleOpenEmployee(employeeId)}>
                            Abrir colaborador
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <DocumentationFormModal
        open={isModalOpen}
        onClose={() => {
          setModalEmployeeId('');
          setIsModalOpen(false);
          setSaveError('');
        }}
        onSubmit={handleSaveDocument}
        employeeId={modalEmployeeId}
        lockEmployee={Boolean(modalEmployeeId)}
        docTypes={docTypes}
        loading={saving}
        error={saveError}
      />
    </div>
  );
}
