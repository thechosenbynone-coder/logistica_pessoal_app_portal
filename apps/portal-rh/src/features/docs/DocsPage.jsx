import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  if (Array.isArray(payload?.dataset?.colaboradores)) {
    return payload.dataset.colaboradores.map((row) => ({
      id: normalizeText(row.COLABORADOR_ID),
      name: normalizeText(row.NOME_COMPLETO)
    }));
  }
  if (Array.isArray(payload?.colaboradores_minimos)) {
    return payload.colaboradores_minimos.map((row) => ({
      id: normalizeText(row.id),
      name: normalizeText(row.nome)
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
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingKey, setEditingKey] = useState('');
  const fileInputRef = useRef(null);

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

  const colaboradoresMap = useMemo(
    () => new Map(colaboradores.map((row) => [normalizeText(row.id), row.name])),
    [colaboradores]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documentacoes.filter((doc) => {
      const id = normalizeText(doc.COLABORADOR_ID);
      const name = normalizeText(colaboradoresMap.get(id));
      if (q && !id.toLowerCase().includes(q) && !name.toLowerCase().includes(q)) return false;
      if (typeFilter && normalizeDocType(doc.TIPO_DOCUMENTO) !== normalizeDocType(typeFilter)) return false;
      if (statusFilter) {
        const status = docValidityStatus(doc);
        if (status !== statusFilter) return false;
      }
      return true;
    });
  }, [documentacoes, query, typeFilter, statusFilter, colaboradoresMap]);

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

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">Documentações</div>
            <div className="text-sm text-slate-500">Cadastro e verificação das documentações obrigatórias.</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                fileInputRef.current?.click();
              }}
            >
              Importar Documentações
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

        <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={handleSave}>
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
          <Input
            value={form.EVIDENCIA_TIPO}
            onChange={(e) => updateForm('EVIDENCIA_TIPO', e.target.value)}
            placeholder="Evidência (UPLOAD/LINK)"
          />
          <Input
            value={form.EVIDENCIA_REF}
            onChange={(e) => updateForm('EVIDENCIA_REF', e.target.value)}
            placeholder="Ref evidência"
          />
          <Input value={form.OBS} onChange={(e) => updateForm('OBS', e.target.value)} placeholder="Observação" />
          <div className="flex items-center gap-2">
            <Button type="submit">{editingKey ? 'Atualizar' : 'Adicionar'}</Button>
            <Button type="button" variant="secondary" onClick={resetForm}>
              Limpar
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por colaborador" />
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
        </div>

        <div className="mt-4 space-y-2">
          {filtered.map((doc) => {
            const status = docValidityStatus(doc) || '—';
            const evidence = evidenceStatus(doc);
            const colabName = colaboradoresMap.get(normalizeText(doc.COLABORADOR_ID)) || '—';
            return (
              <div key={buildDocKey(doc)} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {doc.TIPO_DOCUMENTO} • {colabName}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      ID {doc.COLABORADOR_ID} • Emissão {doc.DATA_EMISSAO || '—'} • Vencimento{' '}
                      {doc.DATA_VENCIMENTO || '—'}
                    </div>
                    {doc.OBS && <div className="mt-1 text-xs text-slate-500">Obs: {doc.OBS}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge tone={status === 'VENCIDO' ? 'red' : status === 'VENCENDO' ? 'amber' : 'green'}>
                      {status}
                    </Badge>
                    <Badge tone={evidence === 'VERIFICADO' ? 'green' : 'gray'}>{evidence}</Badge>
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
    </div>
  );
}
