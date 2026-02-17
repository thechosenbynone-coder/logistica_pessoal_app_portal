import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import Card from '../../ui/Card.jsx';
import Button from '../../ui/Button.jsx';
import Input from '../../ui/Input.jsx';
import Modal from '../../ui/Modal.jsx';
import Badge from '../../ui/Badge.jsx';

const TYPE_OPTIONS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'os', label: 'OS' },
  { value: 'rdo', label: 'RDO' },
  { value: 'finance', label: 'Financeiro' },
  { value: 'lodging', label: 'Hospedagem' },
  { value: 'epi', label: 'EPI' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'approved', label: 'Aprovada' },
  { value: 'rejected', label: 'Rejeitada' },
];

const statusMeta = {
  pending: { label: 'Pendente', tone: 'amber' },
  approved: { label: 'Aprovada', tone: 'green' },
  rejected: { label: 'Rejeitada', tone: 'red' },
};

const INITIAL_REVIEW_MODAL = {
  open: false,
  id: null,
  status: 'approved',
  note: '',
};

function summarizePayload(payload) {
  if (!payload || typeof payload !== 'object') return 'Sem detalhes';
  const preview = Object.entries(payload)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? '[objeto]' : String(value)}`)
    .join(' • ');
  return preview || 'Sem detalhes';
}

function formatDate(date) {
  const timestamp = new Date(date || '').getTime();
  if (!Number.isFinite(timestamp) || timestamp <= 0) return '-';
  return new Date(timestamp).toLocaleString('pt-BR');
}

export default function RequestsPage() {
  const [items, setItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [filters, setFilters] = useState({ type: '', status: '', employeeId: '' });
  const [reviewModal, setReviewModal] = useState(INITIAL_REVIEW_MODAL);

  const employeesById = useMemo(
    () => new Map(employees.map((employee) => [String(employee.id), employee])),
    [employees]
  );

  const loadEmployees = useCallback(async () => {
    try {
      const list = await api.employees.list();
      setEmployees(Array.isArray(list) ? list : []);
    } catch {
      setEmployees([]);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.adminRequests.list(filters);
      setItems(data);
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar as solicitações.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const closeModal = () => {
    if (saving) return;
    setReviewModal(INITIAL_REVIEW_MODAL);
    setModalError('');
  };

  const onReview = async () => {
    if (!reviewModal.id) return;

    setSaving(true);
    setModalError('');

    try {
      await api.adminRequests.update(reviewModal.id, {
        status: reviewModal.status,
        note: reviewModal.note,
      });
      setReviewModal(INITIAL_REVIEW_MODAL);
      await loadRequests();
    } catch (err) {
      console.error(err);
      setModalError('Não foi possível salvar a revisão. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h1 className="text-xl font-semibold text-slate-900">Solicitações</h1>
        <p className="mt-1 text-sm text-slate-500">
          Aprove ou rejeite solicitações enviadas pelos colaboradores.
        </p>
      </Card>

      <Card className="p-6">
        <div className="grid gap-3 md:grid-cols-4">
          <select
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            value={filters.type}
            onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            value={filters.employeeId}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, employeeId: event.target.value }))
            }
          >
            <option value="">Todos os colaboradores</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>

          <Button type="button" variant="secondary" onClick={loadRequests}>
            Atualizar
          </Button>
        </div>
      </Card>

      {loading && <Card className="p-5 text-sm text-slate-500">Carregando solicitações...</Card>}
      {!loading && error && <Card className="p-5 text-sm text-red-600">{error}</Card>}

      {!loading && !error && items.length === 0 && (
        <Card className="p-5 text-sm text-slate-500">
          Nenhuma solicitação encontrada para os filtros selecionados.
        </Card>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="grid gap-3">
          {items.map((item) => {
            const status = statusMeta[item.status] || statusMeta.pending;
            const employee = employeesById.get(String(item.employeeId));

            return (
              <Card key={item.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Tipo</p>
                    <p className="text-base font-semibold text-slate-900">
                      {String(item.type || '-').toUpperCase()}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">Colaborador</p>
                    <p className="text-sm text-slate-800">
                      {employee?.name || `#${item.employeeId}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge tone={status.tone}>{status.label}</Badge>
                    <p className="mt-2 text-xs text-slate-500">
                      Criada em {formatDate(item.createdAt)}
                    </p>
                    {item.reviewedAt && (
                      <p className="mt-1 text-xs text-slate-500">
                        Revisada em {formatDate(item.reviewedAt)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  {summarizePayload(item.payload)}
                </div>

                {item.reviewNote && (
                  <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
                    Nota RH: {item.reviewNote}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setModalError('');
                      setReviewModal({ open: true, id: item.id, status: 'approved', note: '' });
                    }}
                    disabled={item.status === 'approved'}
                  >
                    Aprovar
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => {
                      setModalError('');
                      setReviewModal({ open: true, id: item.id, status: 'rejected', note: '' });
                    }}
                    disabled={item.status === 'rejected'}
                  >
                    Rejeitar
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={reviewModal.open}
        title={reviewModal.status === 'approved' ? 'Aprovar solicitação' : 'Rejeitar solicitação'}
        onClose={closeModal}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Você pode adicionar uma nota opcional para o colaborador.
          </p>
          <Input
            value={reviewModal.note}
            onChange={(event) => setReviewModal((prev) => ({ ...prev, note: event.target.value }))}
            placeholder="Ex.: aprovado conforme política interna"
            disabled={saving}
          />

          {modalError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {modalError}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant={reviewModal.status === 'approved' ? 'primary' : 'danger'}
              onClick={onReview}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
