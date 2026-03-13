import React, { useCallback, useEffect, useState } from 'react';
import { panel, tabStyle, secTitle, monoLabel, chip, thStyle, tdStyle, actionBtn } from '../../ui/pageStyles.js';
import apiService from '../../services/api';
import Modal from '../../ui/Modal';

// ─── Helpers ─────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtBRL(val) {
  if (val === null || val === undefined) return '—';
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const TYPE_TABS = ['Todos', 'Reembolso', 'Adiantamento'];

const STATUS_FILTER = ['Todos', 'PENDENTE', 'APROVADO', 'REJEITADO', 'CORRECAO_SOLICITADA'];

const STATUS_LABEL = {
  PENDENTE: { label: 'Pendente', tone: 'amber' },
  APROVADO: { label: 'Aprovado', tone: 'green' },
  REJEITADO: { label: 'Rejeitado', tone: 'red' },
  CORRECAO_SOLICITADA: { label: 'Correção', tone: 'orange' },
};

// ─── Modal de revisão ─────────────────────────────────────────────

function FinanceReviewModal({ open, onClose, onSubmit, item }) {
  const [action, setAction] = useState('APROVAR');
  const [reason, setReason] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [reviewer, setReviewer] = useState('RH');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setAction('APROVAR');
      setReason('');
      setDueDate('');
      setError('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!reviewer.trim()) {
      setError('Informe quem está revisando.');
      return;
    }
    if (action === 'APROVAR' && !dueDate) {
      setError('Informe o prazo de pagamento.');
      return;
    }
    if (action !== 'APROVAR' && !reason.trim()) {
      setError('Informe o motivo.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSubmit({ action, reason, reviewedBy: reviewer, payment_due_date: dueDate || undefined });
      onClose();
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '5px',
    padding: '7px 10px',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '13px',
    color: 'var(--text)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <Modal open={open} title="Revisar solicitação" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 380 }}>
        {/* Info do item */}
        {item && (
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>
              {item.employee?.name || `#${item.employee_id}`}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)', marginTop: 2 }}>
              {item.type}
              {item.category ? ` · ${item.category}` : ''} · {fmtBRL(item.amount)}
            </div>
          </div>
        )}

        {/* Ação */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'APROVAR', label: 'Aprovar', tone: 'green' },
            { key: 'REJEITAR', label: 'Rejeitar', tone: 'red' },
            { key: 'SOLICITAR_CORRECAO', label: 'Correção', tone: 'amber' },
          ].map(({ key, label, tone }) => {
            const active = action === key;
            const colors = {
              green: { fg: 'var(--green)', bg: 'var(--green-bg)', dim: 'var(--green-dim)' },
              red: { fg: 'var(--red)', bg: 'var(--red-bg)', dim: 'var(--red-dim)' },
              amber: { fg: 'var(--amber)', bg: 'var(--amber-bg)', dim: 'var(--amber-dim)' },
            }[tone];
            return (
              <button
                key={key}
                onClick={() => setAction(key)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  border: `1px solid ${active ? colors.dim : 'var(--border)'}`,
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '9px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  background: active ? colors.bg : 'var(--surface2)',
                  color: active ? colors.fg : 'var(--muted)',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Prazo de pagamento — obrigatório ao aprovar */}
        {action === 'APROVAR' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
              Prazo de pagamento *
            </label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />
          </div>
        )}

        {/* Motivo — obrigatório ao rejeitar/corrigir */}
        {action !== 'APROVAR' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
              Motivo *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Explique o motivo..."
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.4 }}
            />
          </div>
        )}

        {/* Revisado por */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
            Revisado por
          </label>
          <input value={reviewer} onChange={(e) => setReviewer(e.target.value)} style={inputStyle} />
        </div>

        {/* Erro */}
        {error && (
          <div
            style={{
              background: 'var(--red-bg)',
              border: '1px solid var(--red-dim)',
              borderRadius: '5px',
              padding: '7px 10px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '10px',
              color: 'var(--red)',
            }}
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            background: 'var(--accent)',
            border: 'none',
            borderRadius: '5px',
            padding: '9px',
            cursor: loading ? 'not-allowed' : 'pointer',
            color: '#fff',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Salvando...' : 'Confirmar'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Página principal ─────────────────────────────────────────────

export default function FinancePage() {
  const [typeTab, setTypeTab] = useState('Todos');
  const [statusFilter, setStatus] = useState('Todos');
  const [items, setItems] = useState([]);
  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const type = typeTab !== 'Todos' ? typeTab : undefined;
      const status = statusFilter !== 'Todos' ? statusFilter : undefined;
      const data = await apiService.financialRequests.listByType(type, status);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [typeTab, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReview = async (payload) => {
    if (!target) return;
    await apiService.financialRequests.review(target.id, payload);
    setTarget(null);
    load();
  };

  // Totais do filtro atual
  const totalPendente = items.filter((i) => i.status === 'PENDENTE').length;
  const totalValor = items.reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div>
        <div style={secTitle()}>Gestão Financeira</div>
        <div style={monoLabel({ marginTop: 2 })}>Reembolsos e adiantamentos de colaboradores</div>
      </div>

      {/* Métricas rápidas */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: 'Pendentes', value: totalPendente, color: 'var(--amber)', bg: 'var(--amber-bg)', dim: 'var(--amber-dim)' },
          { label: 'Total em tela', value: fmtBRL(totalValor), color: 'var(--text2)', bg: 'var(--surface2)', dim: 'var(--border)' },
        ].map(({ label, value, color, bg, dim }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${dim}`, borderRadius: '6px', padding: '8px 14px' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs de tipo */}
      <div style={{ display: 'flex', gap: 4 }}>
        {TYPE_TABS.map((t) => (
          <span key={t} onClick={() => setTypeTab(t)} style={tabStyle(typeTab === t)}>
            {t}
          </span>
        ))}
      </div>

      {/* Filtros de status */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {STATUS_FILTER.map((s) => (
          <span key={s} onClick={() => setStatus(s)} style={tabStyle(statusFilter === s)}>
            {s === 'Todos' ? 'Todos' : (STATUS_LABEL[s]?.label || s)}
          </span>
        ))}
      </div>

      {/* Tabela */}
      <div style={panel()}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Carregando...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Colaborador</th>
                  <th style={thStyle}>Tipo / Categoria</th>
                  <th style={thStyle}>Valor</th>
                  <th style={thStyle}>Embarque</th>
                  <th style={thStyle}>Prazo Pgto</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Nenhuma solicitação encontrada
                    </td>
                  </tr>
                ) : items.map((item) => {
                  const s = item.status || 'PENDENTE';
                  const meta = STATUS_LABEL[s] || { label: s, tone: 'muted' };
                  const rowBorder = meta.tone === 'red' ? 'var(--red)' : meta.tone === 'amber' ? 'var(--amber)' : meta.tone === 'green' ? 'var(--green)' : 'transparent';
                  const isTerminal = s === 'APROVADO' || s === 'REJEITADO';
                  return (
                    <tr
                      key={item.id}
                      style={{ borderBottom: '1px solid var(--border)', borderLeft: `2px solid ${rowBorder}` }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--surface2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* Colaborador */}
                      <td style={tdStyle()}>
                        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>
                          {item.employee?.name || `#${item.employee_id}`}
                        </div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)' }}>
                          {item.employee?.role || '—'}
                        </div>
                      </td>

                      {/* Tipo / Categoria */}
                      <td style={tdStyle()}>
                        <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>{item.type || '—'}</div>
                        {item.category && (
                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)' }}>{item.category}</div>
                        )}
                      </td>

                      {/* Valor */}
                      <td style={tdStyle()}>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                          {fmtBRL(item.amount)}
                        </span>
                      </td>

                      {/* Embarque */}
                      <td style={tdStyle()}>
                        {item.deployment ? (
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text)' }}>
                              {item.deployment.vessel?.name || `#${item.deployment.id}`}
                            </div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)' }}>
                              {item.deployment.service_type || '—'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)' }}>—</span>
                        )}
                      </td>

                      {/* Prazo de pagamento */}
                      <td style={tdStyle()}>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: item.payment_due_date ? 'var(--text)' : 'var(--muted)' }}>
                          {fmtDate(item.payment_due_date)}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={tdStyle()}>
                        <span style={chip(meta.tone)}>{meta.label}</span>
                      </td>

                      {/* Ação */}
                      <td style={tdStyle()}>
                        <button onClick={() => setTarget(item)} style={actionBtn(isTerminal)}>
                          {isTerminal ? 'Ver' : 'Revisar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FinanceReviewModal
        open={!!target}
        item={target}
        onClose={() => setTarget(null)}
        onSubmit={handleReview}
      />
    </div>
  );
}
