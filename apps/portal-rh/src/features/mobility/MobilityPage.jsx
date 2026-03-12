import React, { useCallback, useEffect, useState } from 'react';
import { tabStyle, secTitle, monoLabel, actionBtn } from '../../ui/pageStyles.js';
import apiService from '../../services/api';
import DeploymentCard from './DeploymentCard';
import DeploymentDetailModal from './DeploymentDetailModal';
import DeploymentFormModal from './DeploymentFormModal';

const columns = ['PLANEJADO', 'CONFIRMADO', 'DOCS_OK', 'EMBARCADO', 'CONCLUIDO'];

const COLUMN_LABELS = {
  PLANEJADO:  'Embarque Planejado',
  CONFIRMADO: 'Confirmado',
  DOCS_OK:    'Docs OK',
  EMBARCADO:  'Embarcado',
  CONCLUIDO:  'Desembarque',
};

const nextStatus = {
  PLANEJADO: 'CONFIRMADO',
  CONFIRMADO: 'DOCS_OK',
  DOCS_OK: 'EMBARCADO',
  EMBARCADO: 'CONCLUIDO',
};

export default function MobilityPage() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [openForm, setOpenForm] = useState(false);

  const load = useCallback(async () => setItems(await apiService.deployments.list()), []);
  useEffect(() => { load(); }, [load]);

  const advance = async (d) => {
    const target = nextStatus[d.status];
    if (!target) return;
    await apiService.deployments.updateStatus(d.id, target);
    load();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={secTitle()}>Escalas e Embarques</div>
          <div style={monoLabel({ marginTop: 2 })}>
            {items.filter(i => ['PLANEJADO','CONFIRMADO','DOCS_OK','EMBARCADO'].includes(i.status)).length} embarques ativos
          </div>
        </div>
        <button
          onClick={() => setOpenForm(true)}
          style={{
            background: 'var(--amber)', color: '#000', border: 'none',
            borderRadius: '6px', padding: '7px 14px', cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
            fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}
        >
          + Novo embarque
        </button>
      </div>

      {/* Colunas */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, 1fr)`, gap: 8 }}>
        {columns.map((col) => {
          const colItems = items.filter(i => i.status === col);
          return (
            <div key={col} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: 8, minHeight: 120 }}>
              <div style={{ ...monoLabel(), display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                {COLUMN_LABELS[col]}
                <span style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '3px', padding: '0 4px', color: 'var(--text2)', fontSize: '9px' }}>
                  {colItems.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {colItems.map(d => (
                  <DeploymentCard key={d.id} deployment={d} onOpen={setSelected} onAdvance={advance} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <DeploymentDetailModal open={!!selected} deployment={selected} onClose={() => setSelected(null)} />
      <DeploymentFormModal
        open={openForm}
        onClose={() => setOpenForm(false)}
        onCreate={async (payload) => {
          await apiService.deployments.create(payload);
          setOpenForm(false);
          load();
        }}
      />
    </div>
  );
}
