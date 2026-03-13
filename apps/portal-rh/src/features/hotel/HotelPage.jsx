import React, { useCallback, useEffect, useState } from 'react';
import apiService from '../../services/api';
import { panel, chip, monoLabel, pageTitle, thStyle, tdStyle, tabStyle, actionBtn } from '../../ui/pageStyles.js';

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const STATUS_META = {
  PLANEJADO:  { label: 'Planejado',  tone: 'muted' },
  CONFIRMADO: { label: 'Confirmado', tone: 'blue' },
  DOCS_OK:    { label: 'Docs OK',    tone: 'green' },
  EMBARCADO:  { label: 'Embarcado',  tone: 'green' },
  CONCLUIDO:  { label: 'Concluído',  tone: 'muted' },
};

const ACCOM_STATUS_META = {
  PENDENTE:   { label: 'Pendente',   tone: 'amber' },
  CONFIRMADO: { label: 'Confirmado', tone: 'green' },
  CANCELADO:  { label: 'Cancelado',  tone: 'red' },
};

const ACCOM_TYPES = ['HOTEL', 'POUSADA', 'CASA_DE_APOIO', 'OUTRO'];

function StatusChip({ status, meta }) {
  const m = meta[status] || { label: status, tone: 'muted' };
  return <span style={chip(m.tone)}>{m.label}</span>;
}

const EMPTY_FORM = { type: 'HOTEL', provider_name: '', check_in: '', check_out: '', address: '', confirmation_code: '', notes: '', status: 'PENDENTE' };

export default function HotelPage() {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('hospedagem');

  // Hospedagem state
  const [accommodations, setAccommodations] = useState([]);
  const [members, setMembers] = useState([]);
  const [addingFor, setAddingFor] = useState(null); // employeeId
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [accomError, setAccomError] = useState('');

  // Passagens state
  const [tickets, setTickets] = useState([]);
  const [ticketForm, setTicketForm] = useState({ type: 'AÉREO', provider: '', locator: '', origin: '', destination: '', notes: '' });
  const [addingTicket, setAddingTicket] = useState(false);
  const [savingTicket, setSavingTicket] = useState(false);

  const loadDeployments = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiService.deployments.list();
      const active = (Array.isArray(list) ? list : list?.data || []).filter(
        (d) => ['PLANEJADO', 'CONFIRMADO', 'DOCS_OK', 'EMBARCADO'].includes(d.status)
      );
      setDeployments(active);
    } catch {
      setDeployments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (deployment) => {
    if (!deployment?.id) return;
    try {
      const [accoms, mems, tix] = await Promise.all([
        apiService.accommodations.listByDeployment(deployment.id),
        apiService.deployments.listMembers(deployment.id),
        apiService.deployments.listTickets(deployment.id),
      ]);
      setAccommodations(Array.isArray(accoms) ? accoms : []);
      setMembers(Array.isArray(mems) ? mems : []);
      setTickets(Array.isArray(tix) ? tix : []);
    } catch {
      setAccommodations([]);
      setMembers([]);
      setTickets([]);
    }
  }, []);

  useEffect(() => { loadDeployments(); }, [loadDeployments]);

  const handleSelect = (d) => {
    setSelected(d);
    setActiveTab('hospedagem');
    setAddingFor(null);
    setForm(EMPTY_FORM);
    setAccomError('');
    setAddingTicket(false);
    loadDetail(d);
  };

  const handleSaveAccom = async (employeeId) => {
    setSaving(true);
    setAccomError('');
    try {
      await apiService.accommodations.create(selected.id, { ...form, employee_id: employeeId });
      setAddingFor(null);
      setForm(EMPTY_FORM);
      await loadDetail(selected);
    } catch (err) {
      setAccomError(err?.message || 'Erro ao salvar hospedagem.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusAccom = async (accommodationId, status) => {
    try {
      await apiService.accommodations.update(selected.id, accommodationId, { status });
      await loadDetail(selected);
    } catch {
      setAccomError('Erro ao atualizar status.');
    }
  };

  const handleRemoveAccom = async (accommodationId) => {
    try {
      await apiService.accommodations.remove(selected.id, accommodationId);
      await loadDetail(selected);
    } catch {
      setAccomError('Erro ao remover hospedagem.');
    }
  };

  const handleSaveTicket = async () => {
    if (!ticketForm.type) return;
    setSavingTicket(true);
    try {
      await apiService.deployments.createTicket(selected.id, ticketForm);
      setAddingTicket(false);
      setTicketForm({ type: 'AÉREO', provider: '', locator: '', origin: '', destination: '', notes: '' });
      await loadDetail(selected);
    } catch {
      // silently fail for now
    } finally {
      setSavingTicket(false);
    }
  };

  const handleRemoveTicket = async (ticketId) => {
    try {
      await apiService.deployments.removeTicket(selected.id, ticketId);
      await loadDetail(selected);
    } catch {}
  };

  // Map employeeId → accommodation record
  const accomByEmployee = {};
  for (const a of accommodations) {
    if (!accomByEmployee[a.employee_id]) accomByEmployee[a.employee_id] = [];
    accomByEmployee[a.employee_id].push(a);
  }

  const confirmedCount = accommodations.filter((a) => a.status === 'CONFIRMADO').length;
  const pendingCount = members.filter((m) => !accomByEmployee[m.employee_id]?.length).length;

  const inputStyle = {
    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '4px',
    padding: '5px 8px', fontFamily: "'DM Sans', sans-serif", fontSize: '12px',
    color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  const selectStyle = { ...inputStyle };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={pageTitle()}>Hotelaria</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Hospedagem · Passagens · Embarques Ativos
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

        {/* ── Lista de embarques ── */}
        <div style={{ ...panel(), width: 280, flexShrink: 0 }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={monoLabel()}>Embarques ativos ({deployments.length})</div>
          </div>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--muted)' }}>
              Carregando...
            </div>
          ) : deployments.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--muted)' }}>
              Nenhum embarque ativo.
            </div>
          ) : (
            deployments.map((d, i) => {
              const isActive = selected?.id === d.id;
              return (
                <div
                  key={d.id}
                  onClick={() => handleSelect(d)}
                  style={{
                    padding: '10px 14px',
                    borderBottom: i < deployments.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                    background: isActive ? 'var(--surface2)' : 'transparent',
                    borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface2)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>
                    {d.vessel?.name || `Embarque #${d.id}`}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <StatusChip status={d.status} meta={STATUS_META} />
                  </div>
                  <div style={monoLabel()}>
                    {fmtDate(d.start_date)} → {fmtDate(d.end_date_expected)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Detalhe ── */}
        {!selected ? (
          <div style={{ ...panel(), flex: 1, padding: 40, textAlign: 'center' }}>
            <div style={monoLabel({ fontSize: '11px' })}>
              Selecione um embarque para gerenciar hospedagem e passagens
            </div>
          </div>
        ) : (
          <div style={{ ...panel(), flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Cabeçalho do detalhe */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                  {selected.vessel?.name || `Embarque #${selected.id}`}
                </div>
                <div style={monoLabel()}>
                  {selected.service_type || '—'} · {fmtDate(selected.start_date)} → {fmtDate(selected.end_date_expected)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={chip('green')}>{confirmedCount} confirmados</span>
                {pendingCount > 0 && <span style={chip('amber')}>{pendingCount} sem hospedagem</span>}
                <span style={chip('muted')}>{tickets.length} passagens</span>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
              {[
                { key: 'hospedagem', label: 'Hospedagem' },
                { key: 'passagens', label: 'Passagens' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setActiveTab(key)} style={{ ...tabStyle(activeTab === key), border: 'none', cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── Tab Hospedagem ── */}
            {activeTab === 'hospedagem' && (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {accomError && (
                  <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-dim)', borderRadius: '5px', padding: '7px 10px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--red)' }}>
                    {accomError}
                  </div>
                )}

                {members.length === 0 ? (
                  <div style={monoLabel({ textAlign: 'center', padding: 20 })}>Nenhum membro na equipe deste embarque.</div>
                ) : (
                  members.map((m) => {
                    const empName = m.employee?.name || `#${m.employee_id}`;
                    const empAccoms = accomByEmployee[m.employee_id] || [];
                    const isAddingThis = addingFor === m.employee_id;

                    return (
                      <div key={m.employee_id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                        {/* Linha do colaborador */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', gap: 10 }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>{empName}</div>
                            <div style={monoLabel()}>{m.employee?.role || '—'}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {empAccoms.length === 0
                              ? <span style={chip('amber')}>Sem hospedagem</span>
                              : empAccoms.map((a) => <StatusChip key={a.id} status={a.status} meta={ACCOM_STATUS_META} />)
                            }
                            {!isAddingThis && (
                              <button
                                onClick={() => { setAddingFor(m.employee_id); setForm(EMPTY_FORM); setAccomError(''); }}
                                style={actionBtn(false)}
                              >
                                + Adicionar
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Lista de hospedagens existentes */}
                        {empAccoms.length > 0 && (
                          <div style={{ borderTop: '1px solid var(--border)', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {empAccoms.map((a) => (
                              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text)' }}>{a.provider_name || a.type}</span>
                                  {a.confirmation_code && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)', marginLeft: 6 }}>#{a.confirmation_code}</span>}
                                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)', marginLeft: 6 }}>{fmtDate(a.check_in)} → {fmtDate(a.check_out)}</span>
                                </div>
                                {a.status !== 'CONFIRMADO' && (
                                  <button onClick={() => handleStatusAccom(a.id, 'CONFIRMADO')} style={{ ...actionBtn(true), color: 'var(--green)', borderColor: 'var(--green-dim)' }}>Confirmar</button>
                                )}
                                {a.status !== 'CANCELADO' && (
                                  <button onClick={() => handleStatusAccom(a.id, 'CANCELADO')} style={{ ...actionBtn(true), color: 'var(--muted)' }}>Cancelar</button>
                                )}
                                <button onClick={() => handleRemoveAccom(a.id)} style={{ ...actionBtn(true), color: 'var(--red)', borderColor: 'var(--red-dim)' }}>✕</button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Formulário inline de nova hospedagem */}
                        {isAddingThis && (
                          <div style={{ borderTop: '1px solid var(--border)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={monoLabel()}>Nova hospedagem</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              <div>
                                <div style={monoLabel({ marginBottom: 3 })}>Tipo</div>
                                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={selectStyle}>
                                  {ACCOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                              <div>
                                <div style={monoLabel({ marginBottom: 3 })}>Status</div>
                                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={selectStyle}>
                                  <option value="PENDENTE">Pendente</option>
                                  <option value="CONFIRMADO">Confirmado</option>
                                  <option value="CANCELADO">Cancelado</option>
                                </select>
                              </div>
                              <div>
                                <div style={monoLabel({ marginBottom: 3 })}>Estabelecimento</div>
                                <input value={form.provider_name} onChange={e => setForm(f => ({ ...f, provider_name: e.target.value }))} placeholder="Nome do hotel..." style={inputStyle} />
                              </div>
                              <div>
                                <div style={monoLabel({ marginBottom: 3 })}>Cód. confirmação</div>
                                <input value={form.confirmation_code} onChange={e => setForm(f => ({ ...f, confirmation_code: e.target.value }))} placeholder="Ex: RES-12345" style={inputStyle} />
                              </div>
                              <div>
                                <div style={monoLabel({ marginBottom: 3 })}>Check-in</div>
                                <input type="date" value={form.check_in} onChange={e => setForm(f => ({ ...f, check_in: e.target.value }))} style={inputStyle} />
                              </div>
                              <div>
                                <div style={monoLabel({ marginBottom: 3 })}>Check-out</div>
                                <input type="date" value={form.check_out} onChange={e => setForm(f => ({ ...f, check_out: e.target.value }))} style={inputStyle} />
                              </div>
                              <div style={{ gridColumn: '1 / -1' }}>
                                <div style={monoLabel({ marginBottom: 3 })}>Endereço</div>
                                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Endereço do estabelecimento..." style={inputStyle} />
                              </div>
                              <div style={{ gridColumn: '1 / -1' }}>
                                <div style={monoLabel({ marginBottom: 3 })}>Notas</div>
                                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observações..." style={inputStyle} />
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => handleSaveAccom(m.employee_id)} disabled={saving} style={{ ...actionBtn(false), opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                                {saving ? 'Salvando...' : 'Salvar'}
                              </button>
                              <button onClick={() => setAddingFor(null)} style={actionBtn(true)}>Cancelar</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Tab Passagens ── */}
            {activeTab === 'passagens' && (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Formulário de nova passagem */}
                {!addingTicket ? (
                  <button onClick={() => setAddingTicket(true)} style={{ ...actionBtn(false), alignSelf: 'flex-start' }}>
                    + Nova passagem
                  </button>
                ) : (
                  <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={monoLabel()}>Nova passagem / ticket</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <div style={monoLabel({ marginBottom: 3 })}>Tipo</div>
                        <select value={ticketForm.type} onChange={e => setTicketForm(f => ({ ...f, type: e.target.value }))} style={selectStyle}>
                          {['AÉREO', 'TRANSFER', 'ÔNIBUS', 'BARCO', 'HELICÓPTERO', 'OUTRO'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={monoLabel({ marginBottom: 3 })}>Fornecedor</div>
                        <input value={ticketForm.provider} onChange={e => setTicketForm(f => ({ ...f, provider: e.target.value }))} placeholder="Ex: LATAM, Azul..." style={inputStyle} />
                      </div>
                      <div>
                        <div style={monoLabel({ marginBottom: 3 })}>Localizador</div>
                        <input value={ticketForm.locator} onChange={e => setTicketForm(f => ({ ...f, locator: e.target.value }))} placeholder="Ex: ABC123" style={inputStyle} />
                      </div>
                      <div>
                        <div style={monoLabel({ marginBottom: 3 })}>Origem</div>
                        <input value={ticketForm.origin} onChange={e => setTicketForm(f => ({ ...f, origin: e.target.value }))} placeholder="Ex: Macaé" style={inputStyle} />
                      </div>
                      <div>
                        <div style={monoLabel({ marginBottom: 3 })}>Destino</div>
                        <input value={ticketForm.destination} onChange={e => setTicketForm(f => ({ ...f, destination: e.target.value }))} placeholder="Ex: Plataforma P-55" style={inputStyle} />
                      </div>
                      <div>
                        <div style={monoLabel({ marginBottom: 3 })}>Notas</div>
                        <input value={ticketForm.notes} onChange={e => setTicketForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observações..." style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={handleSaveTicket} disabled={savingTicket} style={{ ...actionBtn(false), opacity: savingTicket ? 0.6 : 1, cursor: savingTicket ? 'not-allowed' : 'pointer' }}>
                        {savingTicket ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button onClick={() => setAddingTicket(false)} style={actionBtn(true)}>Cancelar</button>
                    </div>
                  </div>
                )}

                {/* Lista de tickets */}
                {tickets.length === 0 ? (
                  <div style={{ ...panel({ padding: 24 }), textAlign: 'center' }}>
                    <span style={monoLabel({ fontSize: '11px' })}>Nenhuma passagem registrada.</span>
                  </div>
                ) : (
                  <div style={{ ...panel(), overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {['Tipo', 'Fornecedor', 'Localizador', 'Origem', 'Destino', ''].map((h) => (
                            <th key={h} style={thStyle}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tickets.map((t, i) => (
                          <tr key={t.id} style={{ borderBottom: i < tickets.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <td style={tdStyle()}><span style={chip('blue')}>{t.type}</span></td>
                            <td style={tdStyle()}>{t.provider || '—'}</td>
                            <td style={tdStyle({ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px' })}>{t.locator || '—'}</td>
                            <td style={tdStyle()}>{t.origin || '—'}</td>
                            <td style={tdStyle()}>{t.destination || '—'}</td>
                            <td style={tdStyle()}>
                              <button onClick={() => handleRemoveTicket(t.id)} style={{ ...actionBtn(true), color: 'var(--red)', borderColor: 'var(--red-dim)' }}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
