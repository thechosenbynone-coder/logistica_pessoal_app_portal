import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../ui/Modal.jsx';
import Button from '../../ui/Button.jsx';
import Input from '../../ui/Input.jsx';
import { normalizeText } from '../../lib/documentationUtils';

const EMPTY_FORM = {
  employee_id: '',
  document_type_id: '',
  issue_date: '',
  expiration_date: '',
  file_url: '',
  evidence_type: '',
  evidence_ref: '',
  notes: '',
  verified: false,
};

export default function DocumentationFormModal({
  open,
  onClose,
  onSubmit,
  employeeId,
  lockEmployee = false,
  docTypes = [],
  loading,
  error,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    setForm((prev) => ({
      ...EMPTY_FORM,
      employee_id: normalizeText(employeeId),
      document_type_id: prev.document_type_id || '',
    }));
  }, [open, employeeId]);

  const selectedDocType = useMemo(
    () => docTypes.find((row) => Number(row.id) === Number(form.document_type_id)),
    [docTypes, form.document_type_id]
  );

  const requiresExpiration =
    selectedDocType?.requires_expiration ?? selectedDocType?.requiresExpiration ?? true;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.({
      ...form,
      employee_id: normalizeText(form.employee_id),
      expiration_date: requiresExpiration ? form.expiration_date : null,
      verified_by: form.verified ? 'RH Portal' : null,
      verified_at: form.verified ? new Date().toISOString() : null,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Adicionar/Atualizar documento">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Colaborador (ID)</label>
          <Input
            value={form.employee_id}
            onChange={(e) => setForm((prev) => ({ ...prev, employee_id: e.target.value }))}
            placeholder="ID do colaborador"
            required
            disabled={lockEmployee}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Tipo de documento</label>
          <select
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
            value={form.document_type_id}
            onChange={(e) => setForm((prev) => ({ ...prev, document_type_id: e.target.value }))}
            required
          >
            <option value="">Selecione</option>
            {docTypes.map((docType) => (
              <option key={docType.id} value={docType.id}>
                {docType.code || docType.name} - {docType.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Data de emissão</label>
            <Input
              type="date"
              value={form.issue_date}
              onChange={(e) => setForm((prev) => ({ ...prev, issue_date: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Data de vencimento {requiresExpiration ? '(obrigatória)' : '(sem validade)'}
            </label>
            <Input
              type="date"
              value={form.expiration_date}
              onChange={(e) => setForm((prev) => ({ ...prev, expiration_date: e.target.value }))}
              required={Boolean(requiresExpiration)}
              disabled={!requiresExpiration}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Arquivo (URL)</label>
          <Input
            value={form.file_url}
            onChange={(e) => setForm((prev) => ({ ...prev, file_url: e.target.value }))}
            placeholder="https://..."
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Tipo de evidência</label>
            <select
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              value={form.evidence_type}
              onChange={(e) => setForm((prev) => ({ ...prev, evidence_type: e.target.value }))}
            >
              <option value="">Não informado</option>
              <option value="URL">URL</option>
              <option value="PDF">PDF</option>
              <option value="IMG">IMG</option>
              <option value="OUTRO">OUTRO</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Referência da evidência</label>
            <Input
              value={form.evidence_ref}
              onChange={(e) => setForm((prev) => ({ ...prev, evidence_ref: e.target.value }))}
              placeholder="link, caminho ou protocolo"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Observações</label>
          <textarea
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            rows={3}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.verified}
            onChange={(e) => setForm((prev) => ({ ...prev, verified: e.target.checked }))}
          />
          Documento verificado
        </label>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
