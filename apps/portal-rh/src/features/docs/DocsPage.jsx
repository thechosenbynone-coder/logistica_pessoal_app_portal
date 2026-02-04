import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';
import Card from '../../ui/Card.jsx';
import Button from '../../ui/Button.jsx';
import Input from '../../ui/Input.jsx';
import Badge from '../../ui/Badge.jsx';
import Modal from '../../ui/Modal.jsx';
import {
  OPTIONAL_DOC_TYPES,
  REQUIRED_DOC_TYPES,
  docValidityStatus,
  evidenceStatus,
  normalizeDocType,
  normalizeText
} from '../../lib/documentationUtils';
import { computeDashboardMetrics, parseXlsxToDocumentacoes } from '../../services/portalXlsxImporter';

const ALL_DOC_TYPES = [...REQUIRED_DOC_TYPES, ...OPTIONAL_DOC_TYPES];

const EMPTY_FORM = {
  COLABORADOR_ID: '',
  TIPO_DOCUMENTO: '',
  DATA_EMISSAO: '',
  DATA_VENCIMENTO: '',
  EVIDENCIA_TIPO: '',
  EVIDENCIA_REF: '',
  OBS: '',
  VERIFIED: false,
  VERIFIED_BY: '',
  VERIFIED_AT: ''
};

function loadPayload() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('portal_rh_xlsx_v1');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractDocumentacoes(payload) {
  return Array.isArray(payload?.dataset?.documentacoes) ? payload.dataset.documentacoes : [];
}

function extractColaboradores(payload) {
  if (Array.isArray(payload?.colaboradores_minimos)) {
    return payload.colaboradores_minimos.map((row) => ({
      id: normalizeText(row.id),
      name: normalizeText(row.nome),
      nome: normalizeText(row.nome)
    }));
  }
  if (Array.isArray(payload?.dataset?.colaboradores)) {
    return payload.dataset.colaboradores.map((row) => ({
      id: normalizeText(row.COLABORADOR_ID),
      name: normalizeText(row.NOME_COMPLETO),
      nome: normalizeText(row.NOME_COMPLETO)
    }));
  }
  return [];
}

function savePayload(nextDocumentacoes) {
  const payload = loadPayload() || { version: 1 };
  const dataset = payload.dataset || {};
  dataset.documentacoes = nextDocumentacoes;
  payload.dataset = dataset;
  payload.metrics = computeDashboardMetrics(dataset);
  if (!payload.importedAt) payload.importedAt = new Date().toISOString();
  window.localStorage.setItem('portal_rh_xlsx_v1', JSON.stringify(payload));
  window.dispatchEvent(new Event('portal_rh_xlsx_updated'));
}

function buildDocKey(doc) {
  return `${normalizeText(doc.COLABORADOR_ID)}::${normalizeDocType(doc.TIPO_DOCUMENTO)}`;
}

function resetVerificationIfChanged(prevDoc, nextDoc) {
  const fields = ['TIPO_DOCUMENTO', 'DATA_EMISSAO', 'DATA_VENCIMENTO', 'EVIDENCIA_TIPO', 'EVIDENCIA_REF'];
  const changed = fields.some((field) => normalizeText(prevDoc?.[field]) !== normalizeText(nextDoc?.[field]));
  if (prevDoc?.VERIFIED && changed) {
    return { ...nextDoc, VERIFIED: false, VERIFIED_BY: '', VERIFIED_AT: '' };
  }
  return nextDoc;
}

export default function DocsPage() {
  const [documentacoes, setDocumentacoes] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [query, setQuery] = useState('');
  const [collaboratorQuery, setCollaboratorQuery] = useState('');
  const [collaboratorFilterId, setCollaboratorFilterId] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [evidenceFilter, setEvidenceFilter] = useState('');
  const [requiredOnly, setRequiredOnly] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingKey, setEditingKey] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const fileInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  useEffect(() => {
    const payload = loadPayload();
    setDocumentacoes(extractDocumentacoes(payload));
    setColaboradores(extractColaboradores(payload));
    const handleUpdate = () => {
      const updated = loadPayload();
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

  const suggestions = useMemo(() => {
    const term = collaboratorQuery.trim().toLowerCase();
    if (term.length < 2) return [];
    const matches = [];
    for (const [id, row] of employeesById.entries()) {
      const name = normalizeText(row.name || row.nome).toLowerCase();
      if (!id.toLowerCase().includes(term) && !name.includes(term)) continue;
      matches.push({ id, name: row.name || row.nome || '' });
      if (matches.length >= 10) break;
    }
    return matches;
  }, [collaboratorQuery, employeesById]);

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
        if (collaboratorFilterId && id !== collaboratorFilterId) return false;
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
    collaboratorFilterId,
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

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingKey('');
  }

  function handleEdit(doc) {
    setForm({ ...EMPTY_FORM, ...doc });
    setEditingKey(buildDocKey(doc));
    setDrawerOpen(true);
  }

  function handleNew() {
    resetForm();
    setDrawerOpen(true);
  }

  function handleSave(e) {
    e.preventDefault();
    const nextDoc = {
      ...form,
      COLABORADOR_ID: normalizeText(form.COLABORADOR_ID),
      TIPO_DOCUMENTO: normalizeText(form.TIPO_DOCUMENTO),
      DATA_EMISSAO: normalizeText(form.DATA_EMISSAO),
      DATA_VENCIMENTO: normalizeText(form.DATA_VENCIMENTO),
      EVIDENCIA_TIPO: normalizeText(form.EVIDENCIA_TIPO),
      EVIDENCIA_REF: normalizeText(form.EVIDENCIA_REF),
      OBS: normalizeText(form.OBS)
    };
    if (!nextDoc.COLABORADOR_ID || !nextDoc.TIPO_DOCUMENTO) return;
    const nextKey = buildDocKey(nextDoc);
    const updated = [...documentacoes];
    const index = updated.findIndex((doc) => buildDocKey(doc) === (editingKey || nextKey));
    if (index >= 0) {
      const prev = updated[index];
      updated[index] = resetVerificationIfChanged(prev, { ...prev, ...nextDoc });
    } else {
      updated.push({ ...nextDoc, VERIFIED: false, VERIFIED_BY: '', VERIFIED_AT: '' });
    }
    savePayload(updated);
    setDocumentacoes(updated);
    resetForm();
    setDrawerOpen(false);
  }

  function handleVerify(doc) {
    const updated = documentacoes.map((item) => {
      if (buildDocKey(item) !== buildDocKey(doc)) return item;
      return {
        ...item,
        VERIFIED: true,
        VERIFIED_BY: item.VERIFIED_BY || 'Usuário Atual',
        VERIFIED_AT: new Date().toISOString()
      };
    });
    savePayload(updated);
    setDocumentacoes(updated);
  }

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
      savePayload(merged);
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
            <div className="text-lg font-semibold text-slate-900">Documentações</div>
            <div className="text-sm text-slate-500">Gestão centralizada das documentações dos colaboradores.</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                fileInputRef.current?.click();
              }}
            >
              Importar XLSX
            </Button>
            <Button type="button" onClick={handleNew}>
              Novo registro
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
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
            onClick={() => applyFilter('status', 'VENCIDO')}
          >
            Vencidos ({summaryCounts.vencidos})
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
            onClick={() => applyFilter('status', 'VENCENDO')}
          >
            Vencendo ({summaryCounts.vencendo})
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
            onClick={() => applyFilter('evidence', 'SEM_EVIDENCIA')}
          >
            Sem evidência ({summaryCounts.semEvidencia})
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
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
          <div className="relative">
            <Input
              value={collaboratorQuery}
              onChange={(e) => {
                setCollaboratorQuery(e.target.value);
                setCollaboratorFilterId('');
              }}
              placeholder="Filtrar por colaborador..."
            />
            {suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-sm">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => {
                      setCollaboratorFilterId(item.id);
                      setCollaboratorQuery(item.name || `ID ${item.id}`);
                    }}
                  >
                    <div className="text-slate-900">{item.name || `ID ${item.id}`}</div>
                    <div className="text-xs text-slate-500">ID {item.id}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <select
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
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
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="VENCIDO">Vencido</option>
            <option value="VENCENDO">Vencendo</option>
            <option value="OK">OK</option>
          </select>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCollaboratorFilterId('');
                setCollaboratorQuery('');
              }}
            >
              Limpar
            </Button>
          </div>
          <select
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            value={evidenceFilter}
            onChange={(e) => setEvidenceFilter(e.target.value)}
          >
            <option value="">Todas evidências</option>
            <option value="SEM_EVIDENCIA">Sem evidência</option>
            <option value="PENDENTE_VERIFICACAO">Pendente verificação</option>
            <option value="VERIFICADO">Verificado</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={requiredOnly}
              onChange={(e) => setRequiredOnly(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-200"
            />
            Somente obrigatórios
          </label>
        </div>

        <div className="mt-4 space-y-2">
          {filtered.map((doc) => {
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
                    <Badge tone={status === 'VENCIDO' ? 'red' : status === 'VENCENDO' ? 'amber' : 'green'}>
                      {status}
                    </Badge>
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
                  <Button type="button" variant="secondary" onClick={() => handleEdit(doc)}>
                    Editar
                  </Button>
                  <Button type="button" onClick={() => handleVerify(doc)} disabled={doc.VERIFIED}>
                    {doc.VERIFIED ? 'Verificado' : 'Marcar como verificado'}
                  </Button>
                </div>
              </div>
            );
          })}
          {!filtered.length && (
            <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
              Nenhuma documentação encontrada.
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={drawerOpen}
        title={editingKey ? 'Editar documentação' : 'Novo registro'}
        onClose={() => {
          setDrawerOpen(false);
        }}
        className="max-w-3xl"
      >
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              value={form.COLABORADOR_ID}
              onChange={(e) => updateForm('COLABORADOR_ID', e.target.value)}
              placeholder="ID do colaborador"
            />
            <Input
              value={form.TIPO_DOCUMENTO}
              onChange={(e) => updateForm('TIPO_DOCUMENTO', e.target.value)}
              placeholder="Tipo (ASO, CBSP...)"
            />
            <Input
              value={form.DATA_EMISSAO}
              onChange={(e) => updateForm('DATA_EMISSAO', e.target.value)}
              placeholder="Data emissão (YYYY-MM-DD)"
            />
            <Input
              value={form.DATA_VENCIMENTO}
              onChange={(e) => updateForm('DATA_VENCIMENTO', e.target.value)}
              placeholder="Data vencimento (YYYY-MM-DD)"
            />
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-900">Evidência</div>
            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                value={form.EVIDENCIA_REF}
                onChange={(e) => {
                  updateForm('EVIDENCIA_TIPO', 'LINK');
                  updateForm('EVIDENCIA_REF', e.target.value);
                }}
                placeholder="Link (cole aqui)"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    uploadInputRef.current?.click();
                  }}
                >
                  Upload PDF
                </Button>
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (e.target) e.target.value = '';
                    if (!file) return;
                    updateForm('EVIDENCIA_TIPO', 'UPLOAD');
                    updateForm('EVIDENCIA_REF', `${file.name} (${file.size} bytes)`);
                  }}
                />
              </div>
            </div>
            {form.EVIDENCIA_REF && (
              <div className="mt-2 text-xs text-slate-500">Ref: {form.EVIDENCIA_REF}</div>
            )}
          </div>

          <Input value={form.OBS} onChange={(e) => updateForm('OBS', e.target.value)} placeholder="Observação" />

          <div className="flex items-center gap-2">
            <Button type="submit">{editingKey ? 'Salvar alterações' : 'Adicionar registro'}</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDrawerOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
