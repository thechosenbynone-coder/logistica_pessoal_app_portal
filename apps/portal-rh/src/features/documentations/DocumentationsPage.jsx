import React, { useEffect, useMemo, useState } from 'react';
import { panel, chip, actionBtn, monoLabel, secTitle, tabStyle, thStyle, tdStyle } from '../../ui/pageStyles.js';
import api from '../../services/api';
import {
  REQUIRED_DOC_TYPES,
  computeDocumentStatus,
  normalizeDocType,
  normalizeText,
} from '../../lib/documentationUtils';
import DocumentationFormModal from './DocumentationFormModal.jsx';

// ─── helpers ──────────────────────────────────────────────────────

function mapQueryStatus(value) {
  if (value === 'expired') return 'VENCIDO';
  if (value === 'expiringSoon') return 'VENCENDO';
  if (value === 'duringDeployment') return 'DURANTE_EMBARQUE';
  if (value === 'missing') return 'FALTANDO';
  return '';
}

function statusTone(status) {
  if (status === 'VENCIDO') return 'red';
  if (status === 'VENCENDO' || status === 'DURANTE_EMBARQUE') return 'amber';
  if (status === 'FALTANDO') return 'muted';
  if (status === 'SEM_VALIDADE') return 'blue';
  return 'green';
}

function statusLabel(status) {
  const labels = {
    OK: 'OK',
    VENCIDO: 'Vencido',
    VENCENDO: 'Vencendo',
    DURANTE_EMBARQUE: 'Vence no embarque',
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

// ─── Componente de métrica resumo ─────────────────────────────────

function SummaryCard({ label, value, tone = 'muted', onClick }) {
  const colors = {
    red: 'var(--red)', amber: 'var(--amber)',
    blue: 'var(--blue)', muted: 'var(--muted)', green: 'var(--green)',
  };
  const color = colors[tone] || colors.muted;
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '6px', padding: '10px 12px', cursor: onClick ? 'pointer' : 'default',
        position: 'relative', overflow: 'hidden', transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = 'var(--border2)'; }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', lineHeight: 1, letterSpacing: '-0.5px', color }}>
        {value}
      </div>
    </div>
  );
}

// ─── Select estilizado ────────────────────────────────────────────

function StyledSelect({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '6px', padding: '7px 10px', color: 'var(--text)',
        fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
        outline: 'none', cursor: 'pointer', width: '100%',
      }}
    >
      {children}
    </select>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

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
      const data = await api.documentations.overview();
      const rows = data?.rows || [];
      setEmployees((data?.employees || []).map(normalizeEmployeeRow));
      setDocTypes(data?.doc_types || []);
      setDocuments(rows);
      const uniqueDeployments = [];
      const deploymentIds = new Set();
      rows.forEach((row) => {
        const deployment = row?.active_deployment;
        if (!deployment || deploymentIds.has(deployment.id)) return;
        deploymentIds.add(deployment.id);
        uniqueDeployments.push(deployment);
      });
      setDeployments(uniqueDeployments);
    } catch (err) {
      console.error('Falha ao carregar documentações.', err);
      setError('Não foi possível carregar as documentações. Tente novamente.');
      setEmployees([]); setDocTypes([]); setDocuments([]); setDeployments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

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

  const documentRows = useMemo(() =>
    (documents || []).map((doc) => {
      const employee = employeesById.get(normalizeText(doc.employee_id));
      const docType = typeById.get(Number(doc.document_type_id));
      const deployment = activeDeploymentsByEmployee.get(normalizeText(doc.employee_id));
      const status = computeDocumentStatus({ doc, docType, deploymentActive: deployment });
      const code = normalizeDocType(docType?.code || docType?.name || doc.document_code);
      return {
        kind: 'document', id: `doc-${doc.id}`,
        employee, doc, docType, code,
        required: requiredCodes.includes(code),
        status, evidenceStatus: getEvidenceStatus(doc),
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
            kind: 'missing', id: `missing-${employeeId}-${requiredCode}`,
            employee, doc: null,
            docType: { code: requiredCode, name: requiredCode, requires_expiration: true },
            code: requiredCode, required: true,
            status: 'FALTANDO', evidenceStatus: 'SEM_EVIDENCIA',
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
        normalizeText(employee.name), normalizeText(employee.cpf),
        normalizeText(row.docType?.name), normalizeText(row.docType?.code),
      ].join(' ').toLowerCase();
      if (q && !fullText.includes(q)) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      if (baseFilter && normalizeText(employee.base) !== baseFilter) return false;
      if (unitFilter && normalizeText(employee.unit) !== unitFilter) return false;
      if (requiredOnly && !row.required) return false;
      return true;
    });
  }, [baseFilter, query, requiredOnly, rows, statusFilter, unitFilter]);

  const summary = useMemo(() => {
    const total = { vencidos: 0, vencendo: 0, duranteEmbarque: 0, faltando: 0, semEvidencia: 0, pendenteVerificacao: 0 };
    rows.forEach((row) => {
      if (row.status === 'VENCIDO') total.vencidos += 1;
      if (row.status === 'VENCENDO') total.vencendo += 1;
      if (row.status === 'DURANTE_EMBARQUE') total.duranteEmbarque += 1;
      if (row.status === 'FALTANDO') total.faltando += 1;
      if (row.kind === 'document' && row.evidenceStatus === 'SEM_EVIDENCIA') total.semEvidencia += 1;
      if (row.kind === 'document' && row.evidenceStatus === 'PENDENTE_VERIFICACAO') total.pendenteVerificacao += 1;
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
      setSaving(true); setSaveError('');
      await api.documents.create(payload);
      setModalEmployeeId(''); setIsModalOpen(false);
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
    if (typeof onOpenEmployee === 'function') { onOpenEmployee(employeeId, 'docs'); return; }
    const next = `/colaboradores?employeeId=${encodeURIComponent(employeeId)}&tab=docs`;
    window.location.assign(next);
  };

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={secTitle()}>Documentações</div>
          <div style={monoLabel({ marginTop: 2 })}>Status real de documentação por colaborador</div>
        </div>
        <button
          onClick={() => { setModalEmployeeId(''); setIsModalOpen(true); }}
          style={{
            background: 'var(--amber)', color: '#000', border: 'none',
            borderRadius: '6px', padding: '7px 14px', cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
            fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}
        >
          + Adicionar documento
        </button>
      </div>

      {/* Métricas de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
        <SummaryCard label="Vencidos"          value={summary.vencidos}            tone="red"   onClick={() => setStatusFilter('VENCIDO')} />
        <SummaryCard label="Vencendo (30d)"    value={summary.vencendo}            tone="amber" onClick={() => setStatusFilter('VENCENDO')} />
        <SummaryCard label="Vence no embarque" value={summary.duranteEmbarque}     tone="amber" onClick={() => setStatusFilter('DURANTE_EMBARQUE')} />
        <SummaryCard label="Faltando"          value={summary.faltando}            tone="muted" onClick={() => setStatusFilter('FALTANDO')} />
        <SummaryCard label="Sem evidência"     value={summary.semEvidencia}        tone="muted" />
        <SummaryCard label="Pend. verificação" value={summary.pendenteVerificacao} tone="blue" />
      </div>

      {/* Filtros */}
      <div style={panel({ padding: 12 })}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nome, CPF, tipo ou código..."
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '6px', padding: '7px 10px', color: 'var(--text)',
              fontFamily: "'DM Sans', sans-serif", fontSize: '13px', outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--amber)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <StyledSelect value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="OK">OK</option>
            <option value="VENCIDO">Vencido</option>
            <option value="VENCENDO">Vencendo</option>
            <option value="DURANTE_EMBARQUE">Durante embarque</option>
            <option value="SEM_VALIDADE">Sem validade</option>
            <option value="FALTANDO">Faltando</option>
          </StyledSelect>
          <StyledSelect value={baseFilter} onChange={e => setBaseFilter(e.target.value)}>
            <option value="">Todas as bases</option>
            {bases.map(v => <option key={v} value={v}>{v}</option>)}
          </StyledSelect>
          <StyledSelect value={unitFilter} onChange={e => setUnitFilter(e.target.value)}>
            <option value="">Todas as unidades</option>
            {units.map(v => <option key={v} value={v}>{v}</option>)}
          </StyledSelect>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={requiredOnly}
              onChange={e => setRequiredOnly(e.target.checked)}
              style={{ accentColor: 'var(--amber)' }}
            />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Somente obrigatórios
            </span>
          </label>
        </div>
      </div>

      {/* Feedback de estado */}
      {loading && (
        <div style={{
          padding: '40px 0', textAlign: 'center',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
          color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Carregando documentações...
        </div>
      )}

      {error && (
        <div style={{
          background: 'var(--red-bg)', border: '1px solid var(--red-dim)',
          borderRadius: '6px', padding: '10px 14px',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--red)',
        }}>
          {error}
        </div>
      )}

      {!loading && !error && filteredRows.length === 0 && (
        <div style={{
          padding: '40px 0', textAlign: 'center',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
          color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Nenhum documento encontrado
        </div>
      )}

      {/* Tabela */}
      {!loading && !error && filteredRows.length > 0 && (
        <div style={panel()}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Colaborador', 'Base / Unidade', 'Documento', 'Validade', 'Evidência', 'Verificação', 'Status', 'Ações'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const employeeId = normalizeText(row.employee?.id);
                  const evidenceType = row.doc?.evidence_type || '—';
                  const evidenceRef = row.doc?.evidence_ref || row.doc?.file_url || '—';
                  const isVerified = Boolean(row.doc?.verified ?? row.doc?.VERIFIED ?? false);
                  const tone = statusTone(row.status);
                  const rowBorder = tone === 'red' ? 'var(--red)' : tone === 'amber' ? 'var(--amber)' : 'transparent';

                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        borderLeft: `2px solid ${rowBorder}`,
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={tdStyle()}>
                        <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: '12px' }}>
                          {row.employee?.name || 'Colaborador não encontrado'}
                        </div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)', marginTop: 2 }}>
                          CPF: {row.employee?.cpf || '—'}
                        </div>
                      </td>
                      <td style={tdStyle({ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--text2)' })}>
                        {row.employee?.base || '—'} / {row.employee?.unit || '—'}
                      </td>
                      <td style={tdStyle({ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--text2)' })}>
                        {row.docType?.name || row.docType?.code || '—'}
                        {row.required && (
                          <span style={{ ...chip('amber'), marginLeft: 6 }}>Obrig.</span>
                        )}
                      </td>
                      <td style={tdStyle({ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--text2)' })}>
                        {row.doc?.expiration_date || '—'}
                      </td>
                      <td style={tdStyle({ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)', maxWidth: 120 })}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {evidenceType} · {evidenceRef}
                        </div>
                      </td>
                      <td style={tdStyle()}>
                        {row.kind === 'missing' || !row.doc ? (
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)' }}>—</span>
                        ) : (
                          <span style={chip(isVerified ? 'green' : 'muted')}>
                            {isVerified ? 'Verificado' : 'Pendente'}
                          </span>
                        )}
                      </td>
                      <td style={tdStyle()}>
                        <span style={chip(tone)}>{statusLabel(row.status)}</span>
                      </td>
                      <td style={tdStyle()}>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => { setModalEmployeeId(employeeId); setIsModalOpen(true); }}
                            style={actionBtn(false)}
                          >
                            Adicionar/Atualizar
                          </button>
                          <button
                            onClick={() => handleOpenEmployee(employeeId)}
                            style={actionBtn(true)}
                          >
                            Ver colaborador
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DocumentationFormModal
        open={isModalOpen}
        onClose={() => { setModalEmployeeId(''); setIsModalOpen(false); setSaveError(''); }}
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
