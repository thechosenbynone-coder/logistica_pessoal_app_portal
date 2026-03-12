import React, { useCallback, useEffect, useState } from 'react';
import Modal from '../../ui/Modal';
import apiService from '../../services/api';

// ─── Helpers ────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const GATE_META = {
  APTO:     { label: 'Apto',       color: 'var(--green)',  bg: 'var(--green-bg)',  dim: 'var(--green-dim)' },
  ATENCAO:  { label: 'Atenção',    color: 'var(--amber)',  bg: 'var(--amber-bg)',  dim: 'var(--amber-dim)' },
  NAO_APTO: { label: 'Não Apto',   color: 'var(--red)',    bg: 'var(--red-bg)',    dim: 'var(--red-dim)' },
  PENDENTE: { label: 'Pendente',   color: 'var(--muted)',  bg: 'var(--surface2)', dim: 'var(--border)' },
};

function GateBadge({ status }) {
  const meta = GATE_META[status] || GATE_META.PENDENTE;
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', fontWeight: 600,
      borderRadius: '3px', padding: '2px 6px', letterSpacing: '0.04em',
      background: meta.bg, color: meta.color, border: `1px solid ${meta.dim}`,
      flexShrink: 0,
    }}>
      {meta.label}
    </span>
  );
}

// ─── Componente principal ────────────────────────────────────────

export default function DeploymentDetailModal({ open, onClose, deployment, onReload }) {
  const [members, setMembers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState('');

  const loadMembers = useCallback(async () => {
    if (!deployment?.id) return;
    try {
      const data = await apiService.deployments.listMembers(deployment.id);
      setMembers(Array.isArray(data) ? data : []);
    } catch { setMembers([]); }
  }, [deployment?.id]);

  useEffect(() => {
    if (open && deployment?.id) {
      loadMembers();
      setSearch('');
      setError('');
      apiService.employees.list().then(list => setEmployees(Array.isArray(list) ? list : [])).catch(() => setEmployees([]));
    }
  }, [open, deployment?.id, loadMembers]);

  const memberIds = new Set(members.map(m => m.employee_id));

  const filtered = search.trim().length < 1 ? [] : employees.filter(e =>
    !memberIds.has(e.id) &&
    (e.name || '').toLowerCase().includes(search.toLowerCase())
  ).slice(0, 6);

  const handleAdd = async (employeeId) => {
    setAdding(true);
    setError('');
    try {
      await apiService.deployments.addMember(deployment.id, employeeId);
      setSearch('');
      await loadMembers();
      if (onReload) onReload();
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('ALREADY_MEMBER')) setError('Colaborador já está neste embarque.');
      else setError('Erro ao adicionar colaborador. Tente novamente.');
    } finally { setAdding(false); }
  };

  const handleRemove = async (employeeId) => {
    setRemoving(employeeId);
    try {
      await apiService.deployments.removeMember(deployment.id, employeeId);
      await loadMembers();
      if (onReload) onReload();
    } catch { setError('Erro ao remover colaborador.'); }
    finally { setRemoving(null); }
  };

  if (!deployment) return null;

  const d = deployment;
  const vessel  = d.vessel?.name  || `Embarque #${d.id}`;
  const service = d.service_type  || d.vessel?.type || '—';

  // Contagens gate
  const aptos    = members.filter(m => m.gate_status === 'APTO').length;
  const atencao  = members.filter(m => m.gate_status === 'ATENCAO').length;
  const naoAptos = members.filter(m => m.gate_status === 'NAO_APTO').length;

  return (
    <Modal open={open} title={vessel} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 460 }}>

        {/* Cabeçalho do embarque */}
        <div style={{
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: '6px', padding: '10px 14px', display: 'grid',
          gridTemplateColumns: '1fr 1fr', gap: '8px 16px',
        }}>
          {[
            ['Tipo de Serviço', service],
            ['Período', `${fmtDate(d.start_date)} → ${fmtDate(d.end_date_expected)}`],
            ['Base de Saída', d.departure_hub || '—'],
            ['Transporte', d.transport_type || '—'],
          ].map(([lbl, val]) => (
            <div key={lbl}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 2 }}>{lbl}</div>
              <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Resumo gate */}
        {members.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: `${members.length} na equipe`, color: 'var(--text2)', bg: 'var(--surface2)', dim: 'var(--border)' },
              { label: `${aptos} aptos`, color: 'var(--green)', bg: 'var(--green-bg)', dim: 'var(--green-dim)' },
              atencao  > 0 && { label: `${atencao} atenção`, color: 'var(--amber)', bg: 'var(--amber-bg)', dim: 'var(--amber-dim)' },
              naoAptos > 0 && { label: `${naoAptos} não aptos`, color: 'var(--red)', bg: 'var(--red-bg)', dim: 'var(--red-dim)' },
            ].filter(Boolean).map(({ label, color, bg, dim }) => (
              <span key={label} style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', fontWeight: 600,
                borderRadius: '3px', padding: '2px 8px', background: bg, color, border: `1px solid ${dim}`,
              }}>{label}</span>
            ))}
          </div>
        )}

        {/* Busca para adicionar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
            Adicionar à equipe
          </div>
          <input
            style={{
              background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '5px',
              padding: '7px 10px', fontFamily: "'DM Sans', sans-serif", fontSize: '13px',
              color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box',
            }}
            placeholder="Buscar colaborador por nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            disabled={adding}
          />
          {/* Resultados da busca */}
          {filtered.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '5px', overflow: 'hidden' }}>
              {filtered.map((emp, i) => (
                <div
                  key={emp.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', cursor: 'pointer', transition: 'background 0.1s',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>{emp.name}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)' }}>{emp.role || '—'}</div>
                  </div>
                  <button
                    onClick={() => handleAdd(emp.id)}
                    disabled={adding}
                    style={{
                      background: 'var(--accent)', border: 'none', borderRadius: '4px',
                      padding: '3px 10px', cursor: 'pointer', color: '#fff',
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', fontWeight: 600,
                      opacity: adding ? 0.6 : 1,
                    }}
                  >
                    + Adicionar
                  </button>
                </div>
              ))}
            </div>
          )}
          {search.trim().length >= 1 && filtered.length === 0 && (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--muted)', padding: '6px 0' }}>
              Nenhum colaborador encontrado fora da equipe.
            </div>
          )}
        </div>

        {/* Erro */}
        {error && (
          <div style={{
            background: 'var(--red-bg)', border: '1px solid var(--red-dim)', borderRadius: '5px',
            padding: '7px 10px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--red)',
          }}>{error}</div>
        )}

        {/* Lista da equipe */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
            Equipe ({members.length})
          </div>

          {members.length === 0 ? (
            <div style={{
              background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px',
              padding: '20px', textAlign: 'center',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--muted)',
            }}>
              Nenhum colaborador adicionado ainda.
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
              {members.map((m, i) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                    borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {/* Avatar inicial */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: 'var(--surface2)',
                    border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 800,
                    fontSize: '10px', color: 'var(--text2)', flexShrink: 0,
                  }}>
                    {(m.employee?.name || '?').charAt(0).toUpperCase()}
                  </div>

                  {/* Nome + cargo */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.employee?.name || `#${m.employee_id}`}
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)' }}>
                      {m.employee?.role || '—'}
                    </div>
                  </div>

                  {/* Gate badge */}
                  <GateBadge status={m.gate_status} />

                  {/* Remover */}
                  <button
                    onClick={() => handleRemove(m.employee_id)}
                    disabled={removing === m.employee_id}
                    title="Remover da equipe"
                    style={{
                      background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px',
                      padding: '3px 6px', cursor: 'pointer', color: 'var(--muted)',
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
                      opacity: removing === m.employee_id ? 0.5 : 1,
                    }}
                  >
                    ✕
                  </button>

                  {/* Notas do gate (se houver) */}
                  {m.gate_notes && (
                    <div style={{
                      position: 'absolute', display: 'none', // tooltip simples omitido por ora
                    }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Notas de gate expandidas (para NAO_APTO e ATENCAO) */}
          {members.some(m => m.gate_notes) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {members.filter(m => m.gate_notes).map(m => (
                <div key={m.id} style={{
                  background: m.gate_status === 'NAO_APTO' ? 'var(--red-bg)' : 'var(--amber-bg)',
                  border: `1px solid ${m.gate_status === 'NAO_APTO' ? 'var(--red-dim)' : 'var(--amber-dim)'}`,
                  borderRadius: '4px', padding: '6px 10px',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
                  color: m.gate_status === 'NAO_APTO' ? 'var(--red)' : 'var(--amber)',
                }}>
                  <strong>{m.employee?.name}:</strong> {m.gate_notes}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
}
