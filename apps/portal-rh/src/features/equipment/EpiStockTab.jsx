import React, { useCallback, useEffect, useState } from 'react';
import { panel, chip, monoLabel, secTitle, actionBtn } from '../../ui/pageStyles.js';
import apiService from '../../services/api';

// Limiar para considerar estoque baixo
const LOW_STOCK_THRESHOLD = 5;

function stockTone(qty) {
  if (qty <= 0) return 'red';
  if (qty <= LOW_STOCK_THRESHOLD) return 'amber';
  return 'green';
}

export default function EpiStockTab() {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCatalog(await apiService.epiCatalog.list()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const lowCount = catalog.filter(i => i.stock_qty <= LOW_STOCK_THRESHOLD).length;

  return (
    <div style={panel()}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={secTitle()}>Estoque EPI</div>
          <div style={monoLabel({ marginTop: 2 })}>
            {catalog.length} item{catalog.length !== 1 ? 's' : ''} cadastrados
            {lowCount > 0 && ` · ${lowCount} com estoque baixo`}
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            ...actionBtn(true),
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {/* Tabela */}
      {loading && catalog.length === 0 ? (
        <div style={{
          padding: '40px 0', textAlign: 'center',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
          color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Carregando...
        </div>
      ) : catalog.length === 0 ? (
        <div style={{
          padding: '40px 0', textAlign: 'center',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
          color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Nenhum item no catálogo
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Item EPI', 'Estoque', 'Situação'].map(h => (
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
              {catalog.map((item, i) => {
                const tone = stockTone(item.stock_qty);
                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: i < catalog.length - 1 ? '1px solid var(--border)' : 'none',
                      borderLeft: tone === 'red' ? '2px solid var(--red)' : tone === 'amber' ? '2px solid var(--amber)' : '2px solid transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>
                      {item.name}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px',
                        letterSpacing: '-0.5px',
                        color: tone === 'red' ? 'var(--red)' : tone === 'amber' ? 'var(--amber)' : 'var(--green)',
                      }}>
                        {item.stock_qty ?? '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={chip(tone)}>
                        {item.stock_qty <= 0 ? 'Sem estoque' : item.stock_qty <= LOW_STOCK_THRESHOLD ? 'Estoque baixo' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
