import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Modal from '../../ui/Modal';
import {
  OPTIONAL_DOC_TYPES,
  REQUIRED_DOC_TYPES,
  docValidityStatus,
  evidenceStatus,
  normalizeDocType,
  normalizeText
} from '../../lib/documentationUtils';
import { computeDashboardMetrics } from '../../services/portalXlsxImporter';
import { mergePortalPayload, readPortalPayload, writePortalPayload } from '../../lib/portalStorage';

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

export default function EmployeeDocsTab({ employee }) {
  const [documentacoes, setDocumentacoes] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingKey, setEditingKey] = useState('');
  const [originalDoc, setOriginalDoc] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const uploadInputRef = useRef(null);

  useEffect(() => {
    const payload = readPortalPayload();
    setDocumentacoes(Array.isArray(payload?.dataset?.documentacoes) ? payload.dataset.documentacoes : []);
    const handleUpdate = () => {
      const updated = readPortalPayload();
      setDocumentacoes(Array.isArray(updated?.dataset?.documentacoes) ? updated.dataset.documentacoes : []);
    };
    window.addEventListener('portal_rh_xlsx_updated', handleUpdate);
    return () => {
      window.removeEventListener('portal_rh_xlsx_updated', handleUpdate);
    };
  }, []);

  const employeeId = normalizeText(employee?.id || employee?.COLABORADOR_ID);

  const docsForEmployee = useMemo(() => {
    if (!employeeId) return [];
    return documentacoes
      .filter((doc) => normalizeText(doc.COLABORADOR_ID) === employeeId)
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
  }, [documentacoes, employeeId]);

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm({ ...EMPTY_FORM, COLABORADOR_ID: employeeId });
    setEditingKey('');
    setOriginalDoc(null);
  }

  function handleEdit(doc) {
    setForm({ ...EMPTY_FORM, ...doc });
    setEditingKey(buildDocKey(doc));
    setOriginalDoc(doc);
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
      COLABORADOR_ID: employeeId,
      TIPO_DOCUMENTO: normalizeText(form.TIPO_DOCUMENTO),
      DATA_EMISSAO: normalizeText(form.DATA_EMISSAO),
      DATA_VENCIMENTO: normalizeText(form.DATA_VENCIMENTO),
      EVIDENCIA_TIPO: normalizeText(form.EVIDENCIA_TIPO),
      EVIDENCIA_REF: normalizeText(form.EVIDENCIA_REF),
      OBS: normalizeText(form.OBS)
    };
    if (!nextDoc.COLABORADOR_ID || !nextDoc.TIPO_DOCUMENTO) return;
    let updatedDoc = { ...nextDoc };
    if (updatedDoc.VERIFIED) {
      updatedDoc = {
        ...updatedDoc,
        VERIFIED_BY: updatedDoc.VERIFIED_BY || 'Usuário Atual',
        VERIFIED_AT: updatedDoc.VERIFIED_AT || new Date().toISOString()
      };
    } else {
      updatedDoc = { ...updatedDoc, VERIFIED_BY: '', VERIFIED_AT: '' };
    }
    if (originalDoc) {
      updatedDoc = resetVerificationIfChanged(originalDoc, updatedDoc);
    }

    const updated = [...documentacoes];
    const index = updated.findIndex((doc) => buildDocKey(doc) === (editingKey || buildDocKey(updatedDoc)));
    if (index >= 0) {
      const prev = updated[index];
      updated[index] = resetVerificationIfChanged(prev, { ...prev, ...updatedDoc });
    } else {
      updated.push(updatedDoc);
    }

    const prevPayload = readPortalPayload();
    const nextDataset = { ...prevPayload.dataset, documentacoes: updated };
    const nextPayload = mergePortalPayload(prevPayload, {
      dataset: nextDataset,
      metrics: computeDashboardMetrics(nextDataset),
      importedAt: prevPayload.importedAt || new Date().toISOString()
    });
    writePortalPayload(nextPayload);
    setDocumentacoes(updated);
    resetForm();
    setDrawerOpen(false);
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">Documentações</div>
            <div className="text-xs text-slate-500">Gerencie documentos, evidências e verificação.</div>
          </div>
          <Button type="button" onClick={handleNew}>
            Adicionar documento
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {docsForEmployee.map((doc) => {
            const status = docValidityStatus(doc) || 'OK';
            const evidence = evidenceStatus(doc);
            const docType = normalizeDocType(doc.TIPO_DOCUMENTO);
            const isRequired = REQUIRED_DOC_TYPES.includes(docType);
            const hasEvidence = evidence !== 'SEM_EVIDENCIA';
            return (
              <div key={buildDocKey(doc)} className="rounded-xl border border-slate-200 p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                  <div className="md:col-span-2">
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
                      <Paperclip size={14} className={hasEvidence ? 'text-slate-600' : 'text-slate-300'} />
                      <span title={hasEvidence ? evidence : 'Adicionar PDF ou link'}>{evidence}</span>
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
                </div>
              </div>
            );
          })}
          {!docsForEmployee.length && (
            <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
              Nenhuma documentação encontrada para este colaborador.
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={drawerOpen}
        title={editingKey ? 'Editar documentação' : 'Novo documento'}
        onClose={() => {
          setDrawerOpen(false);
        }}
        className="max-w-3xl"
      >
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              value={form.TIPO_DOCUMENTO}
              onChange={(e) => updateForm('TIPO_DOCUMENTO', e.target.value)}
            >
              <option value="">Selecione o tipo</option>
              {ALL_DOC_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
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
                value={form.EVIDENCIA_TIPO === 'LINK' ? form.EVIDENCIA_REF : ''}
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

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.VERIFIED}
              onChange={(e) => {
                const checked = e.target.checked;
                updateForm('VERIFIED', checked);
                updateForm('VERIFIED_BY', checked ? 'Usuário Atual' : '');
                updateForm('VERIFIED_AT', checked ? new Date().toISOString() : '');
              }}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-200"
            />
            Verificado
          </label>

          <div className="flex items-center gap-2">
            <Button type="submit">{editingKey ? 'Salvar alterações' : 'Adicionar documento'}</Button>
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
