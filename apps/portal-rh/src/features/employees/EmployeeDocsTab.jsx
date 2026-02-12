import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button.jsx';
import api from '../../services/api';
import {
  REQUIRED_DOC_TYPES,
  computeDocumentStatus,
  normalizeDocType,
  normalizeText,
} from '../../lib/documentationUtils';
import DocumentationFormModal from '../documentations/DocumentationFormModal.jsx';

function getActiveDeployment(deployments) {
  return deployments.find((deployment) => !deployment.end_date_actual) || null;
}

function getStatusTone(status) {
  if (status === 'VENCIDO') return 'red';
  if (status === 'VENCENDO' || status === 'DURANTE_EMBARQUE') return 'amber';
  if (status === 'FALTANDO') return 'gray';
  if (status === 'SEM_VALIDADE') return 'blue';
  return 'green';
}

export default function EmployeeDocsTab({ employee }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [deployments, setDeployments] = useState([]);

  const employeeId = normalizeText(employee?.id || employee?.COLABORADOR_ID);

  const loadData = async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      setError('');
      const [documentRows, docTypeRows, deploymentRows] = await Promise.all([
        api.documents.listByEmployee(employeeId),
        api.documentTypes.list(),
        api.deployments.listByEmployee(employeeId),
      ]);
      setDocuments(documentRows || []);
      setDocTypes(docTypeRows || []);
      setDeployments(deploymentRows || []);
    } catch (err) {
      console.error('Falha ao carregar documentações do colaborador.', err);
      setError('Não foi possível carregar as documentações do colaborador.');
      setDocuments([]);
      setDocTypes([]);
      setDeployments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [employeeId]);

  const typeById = useMemo(() => {
    const map = new Map();
    docTypes.forEach((row) => map.set(Number(row.id), row));
    return map;
  }, [docTypes]);

  const activeDeployment = useMemo(() => getActiveDeployment(deployments), [deployments]);

  const docsWithStatus = useMemo(() => {
    return documents.map((doc) => {
      const docType = typeById.get(Number(doc.document_type_id));
      const status = computeDocumentStatus({ doc, docType, deploymentActive: activeDeployment });
      return { ...doc, docType, status };
    });
  }, [activeDeployment, documents, typeById]);

  const missingRequired = useMemo(() => {
    const present = new Set(
      docsWithStatus.map((doc) => normalizeDocType(doc.docType?.code || doc.docType?.name || doc.document_code))
    );
    return REQUIRED_DOC_TYPES.filter((code) => !present.has(normalizeDocType(code)));
  }, [docsWithStatus]);

  const handleSaveDocument = async (payload) => {
    try {
      setSaving(true);
      setSaveError('');
      await api.documents.create(payload);
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Falha ao salvar documento do colaborador.', err);
      setSaveError(err?.response?.data?.message || 'Não foi possível salvar o documento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">Documentações</div>
          <div className="text-xs text-slate-500">Status por validade, embarque e obrigatoriedade.</div>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Adicionar documento</Button>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      {loading && <div className="mt-4 rounded-xl border border-slate-200 p-3 text-sm text-slate-500">Carregando documentações...</div>}

      {!loading && !error && (
        <div className="mt-4 space-y-3">
          {docsWithStatus.map((doc) => {
            const isVerified = Boolean(doc.verified ?? doc.VERIFIED ?? false);
            return (
            <div key={doc.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{doc.docType?.name || doc.document_name || 'Documento'}</div>
                  <div className="text-xs text-slate-500">Código: {doc.docType?.code || doc.document_code || '—'}</div>
                </div>
                <Badge tone={getStatusTone(doc.status)}>{doc.status}</Badge>
              </div>
              <div className="mt-2 text-xs text-slate-600">
                Emissão: {doc.issue_date || '—'} • Vencimento: {doc.expiration_date || '—'}
              </div>
              <div className="mt-1 text-xs text-slate-600">
                Evidência: {doc.evidence_type || '—'} • {doc.evidence_ref || doc.file_url || '—'}
              </div>
              <div className="mt-2">
                <Badge tone={isVerified ? 'green' : 'gray'}>{isVerified ? 'Verificado' : 'Pendente verificação'}</Badge>
              </div>
            </div>
            );
          })}

          {!docsWithStatus.length && (
            <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
              Nenhuma documentação encontrada para este colaborador.
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Obrigatórios faltando</div>
            {missingRequired.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {missingRequired.map((code) => (
                  <Badge key={code} tone="gray">
                    {code}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-sm text-slate-600">Nenhum obrigatório faltando.</div>
            )}
          </div>
        </div>
      )}

      <DocumentationFormModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSaveError('');
        }}
        onSubmit={handleSaveDocument}
        employeeId={employeeId}
        lockEmployee
        docTypes={docTypes}
        loading={saving}
        error={saveError}
      />
    </Card>
  );
}
