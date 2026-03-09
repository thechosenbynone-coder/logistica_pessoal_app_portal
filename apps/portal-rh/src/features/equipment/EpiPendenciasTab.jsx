import React, { useCallback, useEffect, useState } from 'react';
import { panel, chip, actionBtn, monoLabel, secTitle } from '../../ui/pageStyles.js';
import EpiReturnModal from './EpiReturnModal';
import apiService from '../../services/api';

export default function EpiPendenciasTab() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setRows(await apiService.epiDeliveries.listPendencias());
  }, []);

  useEffect(() => { load(); }, [load]);

  // Dias até o próximo embarque
  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  };

  return (
    <div style={panel()}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={secTitle()}>Pendências EPI</div>
          <div style={monoLabel({ marginTop: 2 })}>{rows.length} item{rows.length !== 1 ? 's' : ''} aguardando</div>
        </div>
      </div>

      {/* Tabela */}
      {rows.length === 0 ? (
        <div style={{
          padding: '40px 0', textAlign: 'center',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
          color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Nenhuma pendência encontrada
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Colaborador', 'EPI', 'Status', 'Próximo embarque', 'Ação'].map(h => (
                  <th key={h} style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
                    textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)',
                    padding: '8px 12px', textAlign: 'left',
                    background: 'var(--bg)', borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const deployDate = r.next_deployment?.startDate || r.next_deployment?.endDateExpected;
                const days = daysUntil(deployDate);
                const urgent = days !== null && days <= 7;
                const tone = urgent ? 'red' : 'amber';

                return (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      borderLeft: urgent ? '2px solid var(--red)' : '2px solid transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>
                      {r.employee?.name || `Colaborador ${r.employee_id}`}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--text2)' }}>
                      {r.epi_item?.name || '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={chip(tone)}>{r.status}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {deployDate ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: urgent ? 'var(--red)' : 'var(--text2)' }}>
                            {new Date(deployDate).toLocaleDateString('pt-BR')}
                          </span>
                          {urgent && (
                            <span style={chip('red')}>{days}d</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button
                        onClick={() => setSelected(r)}
                        style={actionBtn(false)}
                      >
                        Registrar devolução
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <EpiReturnModal
        open={!!selected}
        delivery={selected || {}}
        onClose={() => setSelected(null)}
        onDone={load}
      />
    </div>
  );
}
