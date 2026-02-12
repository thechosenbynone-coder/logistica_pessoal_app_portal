import React, { useEffect, useMemo, useState } from 'react';
import { Paperclip } from 'lucide-react';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import api from '../../services/api';
import {
  REQUIRED_DOC_TYPES,
  docValidityStatus,
  evidenceStatus,
  normalizeDocType,
  normalizeText
} from '../../lib/documentationUtils';

function normalizeDocsResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.documents)) return data.documents;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function normalizeDocRow(row) {
  const normalized = {
    COLABORADOR_ID: normalizeText(row?.COLABORADOR_ID || row?.employeeId || row?.employee_id),
    TIPO_DOCUMENTO: normalizeText(row?.TIPO_DOCUMENTO || row?.documentType || row?.document_type || row?.type),
    DATA_VENCIMENTO: normalizeText(row?.DATA_VENCIMENTO || row?.expirationDate || row?.expiration_date),
    EVIDENCIA_TIPO: normalizeText(row?.EVIDENCIA_TIPO || row?.evidenceType || row?.evidence_type),
    EVIDENCIA_REF: normalizeText(row?.EVIDENCIA_REF || row?.evidenceRef || row?.evidence_ref),
    VERIFIED: Boolean(row?.VERIFIED ?? row?.verified ?? false)
  };
  if (!normalized.COLABORADOR_ID || !normalized.TIPO_DOCUMENTO) return null;
  return normalized;
}

function buildDocKey(doc) {
  return `${normalizeText(doc.COLABORADOR_ID)}::${normalizeDocType(doc.TIPO_DOCUMENTO)}`;
}

export default function EmployeeDocsTab({ employee }) {
  const [documentacoes, setDocumentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const employeeId = normalizeText(employee?.id || employee?.COLABORADOR_ID);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError('');
        let data = [];

        if (employeeId && typeof api.documents.listByEmployee === 'function') {
          data = await api.documents.listByEmployee(employeeId);
        } else {
          data = await api.documents.list();
        }

        if (!mounted) return;

        const docs = normalizeDocsResponse(data)
          .map(normalizeDocRow)
          .filter(Boolean)
          .filter((doc) => !employeeId || normalizeText(doc.COLABORADOR_ID) === employeeId);

        setDocumentacoes(docs);
      } catch (err) {
        if (!mounted) return;
        console.error('Falha ao carregar documentações do colaborador.', err);
        setError('Falha ao carregar documentações.');
        setDocumentacoes([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [employeeId]);

  const docsForEmployee = useMemo(() => {
    return [...documentacoes].sort((a, b) => {
      const order = { VENCIDO: 0, VENCENDO: 1, OK: 2 };
      const statusA = docValidityStatus(a) || 'OK';
      const statusB = docValidityStatus(b) || 'OK';
      const diff = (order[statusA] ?? 3) - (order[statusB] ?? 3);
      if (diff !== 0) return diff;
      const dateA = normalizeText(a.DATA_VENCIMENTO) || '9999-12-31';
      const dateB = normalizeText(b.DATA_VENCIMENTO) || '9999-12-31';
      return dateA.localeCompare(dateB);
    });
  }, [documentacoes]);

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div>
          <div className="text-sm font-semibold text-slate-900">Documentações</div>
          <div className="text-xs text-slate-500">Visão de documentos, evidências e status.</div>
        </div>

        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div className="mt-4 space-y-2">
          {loading && <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">Carregando documentações...</div>}

          {!loading && docsForEmployee.map((doc) => {
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
                    <Badge tone={status === 'VENCIDO' ? 'red' : status === 'VENCENDO' ? 'amber' : 'green'}>{status}</Badge>
                  </div>
                  <div className="md:col-span-1">
                    <div className="text-xs text-slate-500">Evidência</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                      <Paperclip size={14} className={hasEvidence ? 'text-slate-600' : 'text-slate-300'} />
                      <span>{evidence}</span>
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <div className="text-xs text-slate-500">Verificação</div>
                    <Badge tone={doc.VERIFIED ? 'green' : 'gray'}>{doc.VERIFIED ? 'Verificado' : 'Pendente'}</Badge>
                  </div>
                </div>
              </div>
            );
          })}

          {!loading && !docsForEmployee.length && (
            <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
              Nenhuma documentação encontrada para este colaborador.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
