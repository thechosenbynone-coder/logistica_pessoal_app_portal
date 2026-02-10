import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';
import Card from '../../ui/Card.jsx';
import Button from '../../ui/Button.jsx';
import Input from '../../ui/Input.jsx';
import Badge from '../../ui/Badge.jsx';
import {
  OPTIONAL_DOC_TYPES,
  REQUIRED_DOC_TYPES,
  docValidityStatus,
  evidenceStatus,
  normalizeDocType,
  normalizeText
} from '../../lib/documentationUtils';
import { computeDashboardMetrics, parseXlsxToDocumentacoes } from '../../services/portalXlsxImporter';
import { mergePayload, readPayload, writePayload } from '../../services/portalStorage';
import { isDemoMode } from '../../services/demoMode';

const ALL_DOC_TYPES = [...REQUIRED_DOC_TYPES, ...OPTIONAL_DOC_TYPES];

function extractDocumentacoes(payload) {
  return Array.isArray(payload?.dataset?.documentacoes) ? payload.dataset.documentacoes : [];
}

function extractColaboradores(payload) {
  const rows =
    payload?.dataset?.colaboradores ||
    payload?.colaboradores_minimos ||
    payload?.dataset?.colaboradores_minimos ||
    [];
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    id: normalizeText(row.COLABORADOR_ID || row.id),
    name: normalizeText(row.NOME_COMPLETO || row.nome || row.name),
    nome: normalizeText(row.NOME_COMPLETO || row.nome || row.name)
  }));
}

function buildDocKey(doc) {
  return `${normalizeText(doc.COLABORADOR_ID)}::${normalizeDocType(doc.TIPO_DOCUMENTO)}`;
}

export default function DocsPage({ onOpenEmployee }) {
  const [documentacoes, setDocumentacoes] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [evidenceFilter, setEvidenceFilter] = useState('');
  const [requiredOnly, setRequiredOnly] = useState(false);
  const fileInputRef = useRef(null);
  const demoMode = isDemoMode();

  useEffect(() => {
    const payload = readPayload();
    setDocumentacoes(extractDocumentacoes(payload));
    setColaboradores(extractColaboradores(payload));
    const handleUpdate = () => {
      const updated = readPayload();
      setDocumentacoes(extractDocumentacoes(updated));
      setColaboradores(extractColaboradores(updated));
    };
    window.addEventListener('portal_rh_xlsx_updated', handleUpdate);
    return () => {
      window.removeEventListener('portal_rh_xlsx_updated', handleUpdate);
    };
  }, []);

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
        if (
          q &&
          !id.toLowerCase().includes(q) &&
          !name.toLowerCase().includes(q) &&
          !type.toLowerCase().includes(q)
        )
          return false;
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
  }, [
    documentacoes,
    query,
    typeFilter,
    statusFilter,
    evidenceFilter,
    requiredOnly,
    employeesById
  ]);

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

  async function handleImport(file) {
    if (!file) return;
    try {
      const imported = await parseXlsxToDocumentacoes(file);
      if (!imported.length) return;
      const updated = [...documentacoes];
      const map = new Map(updated.map((doc) => [buildDocKey(doc), doc]));
      imported.forEach((doc) => {
        const key = buildDocKey(doc);
        const prev = map.get(key);
        if (prev) {
          map.set(key, {
            ...prev,
            DATA_EMISSAO: doc.DATA_EMISSAO,
            DATA_VENCIMENTO: doc.DATA_VENCIMENTO,
            EVIDENCIA_TIPO: doc.EVIDENCIA_TIPO,
            EVIDENCIA_REF: doc.EVIDENCIA_REF,
            OBS: doc.OBS,
            VERIFIED: false,
            VERIFIED_BY: '',
            VERIFIED_AT: ''
          });
        } else {
          map.set(key, doc);
        }
      });
      const merged = Array.from(map.values());
      const prevPayload = readPayload();
      const nextDataset = { ...prevPayload.dataset, documentacoes: merged };
      if (!Array.isArray(nextDataset.colaboradores) || nextDataset.colaboradores.length === 0) {
        const fallback =
          prevPayload.colaboradores_minimos || prevPayload.dataset?.colaboradores_minimos || [];
        if (Array.isArray(fallback) && fallback.length) {
          nextDataset.colaboradores_minimos = fallback;
        }
      }
      const nextPayload = mergePayload(prevPayload, {
        dataset: nextDataset,
        metrics: computeDashboardMetrics(nextDataset),
        importedAt: prevPayload.importedAt || new Date().toISOString()
      });
      writePayload(nextPayload);
      setDocumentacoes(merged);
    } catch (err) {
      console.error('Falha ao importar documentações.', err);
    }
  }

  function applyFilter(type, value) {
    if (type === 'status') setStatusFilter(value);
    if (type === 'evidence') setEvidenceFilter(value);
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-bold text-slate-100">Documentações (Painel de Massa)</div>
            <div className="text-sm text-slate-400">
              Importação e triagem de pendências. Para editar, abra o colaborador.
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!demoMode && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                >
                  Importar XLSX
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (e.target) e.target.value = '';
                    handleImport(file);
                  }}
                />
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-slate-700/60 bg-slate-900/50 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800/60"
            onClick={() => applyFilter('status', 'VENCIDO')}
          >
            Vencidos ({summaryCounts.vencidos})
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-700/60 bg-slate-900/50 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800/60"
            onClick={() => applyFilter('status', 'VENCENDO')}
          >
            Vencendo ({summaryCounts.vencendo})
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-700/60 bg-slate-900/50 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800/60"
            onClick={() => applyFilter('evidence', 'SEM_EVIDENCIA')}
          >
            Sem evidência ({summaryCounts.semEvidencia})
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-700/60 bg-slate-900/50 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800/60"
            onClick={() => applyFilter('evidence', 'PENDENTE_VERIFICACAO')}
          >
            Pendente verificação ({summaryCounts.pendente})
          </button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por colaborador, ID ou tipo"
          />
          <select
            className="w-full rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            {ALL_DOC_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="VENCIDO">Vencido</option>
            <option value="VENCENDO">Vencendo</option>
            <option value="OK">OK</option>
          </select>
          <select
            className="w-full rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
            value={evidenceFilter}
            onChange={(e) => setEvidenceFilter(e.target.value)}
          >
            <option value="">Todas evidências</option>
            <option value="SEM_EVIDENCIA">Sem evidência</option>
            <option value="PENDENTE_VERIFICACAO">Pendente verificação</option>
            <option value="VERIFICADO">Verificado</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={requiredOnly}
              onChange={(e) => setRequiredOnly(e.target.checked)}
              className="rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500/40"
            />
            Somente obrigatórios
          </label>
        </div>

        <div className="mt-4 space-y-2">
          {!colaboradores.length && (
            <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-amber-300">
              Importe colaboradores para exibir nomes completos.
            </div>
          )}
          {filtered.map((doc) => {
            const status = docValidityStatus(doc) || 'OK';
            const evidence = evidenceStatus(doc);
            const id = normalizeText(doc.COLABORADOR_ID);
            const collaborator = employeesById.get(id);
            const colabName = collaborator?.name || collaborator?.nome || `ID ${id}`;
            const docType = normalizeDocType(doc.TIPO_DOCUMENTO);
            const isRequired = REQUIRED_DOC_TYPES.includes(docType);
            return (
              <div key={buildDocKey(doc)} className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
                  <div className="md:col-span-2">
                    <div className="text-sm font-semibold text-slate-100">{colabName}</div>
                    <div className="text-xs font-mono text-slate-400">ID {id}</div>
                  </div>
                  <div className="md:col-span-1">
                    <div className="text-sm font-semibold text-slate-100">{doc.TIPO_DOCUMENTO}</div>
                    <div className="text-xs font-mono text-slate-400">{isRequired ? 'Obrigatório' : 'Opcional'}</div>
                  </div>
                  <div className="md:col-span-1">
                    <div className="text-xs font-mono text-slate-400">Vencimento</div>
                    <div className="text-sm font-mono text-slate-200">{doc.DATA_VENCIMENTO || '—'}</div>
                    <Badge tone={status === 'VENCIDO' ? 'red' : status === 'VENCENDO' ? 'amber' : 'green'}>
                      {status}
                    </Badge>
                  </div>
                  <div className="md:col-span-1">
                    <div className="text-xs font-mono text-slate-400">Evidência</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-300">
                      <Paperclip size={14} />
                      {evidence}
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <div className="text-xs font-mono text-slate-400">Verificação</div>
                    <Badge tone={doc.VERIFIED ? 'green' : 'gray'}>{doc.VERIFIED ? 'Verificado' : 'Pendente'}</Badge>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onOpenEmployee?.(id, 'docs')}
                  >
                    Abrir colaborador
                  </Button>
                </div>
              </div>
            );
          })}
          {!filtered.length && (
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-4 text-sm text-slate-400">
              Nenhuma documentação encontrada.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
