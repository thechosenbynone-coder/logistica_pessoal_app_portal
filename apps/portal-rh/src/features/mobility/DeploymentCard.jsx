import React from 'react';
import { actionBtn } from '../../ui/pageStyles.js';

export default function DeploymentCard({ deployment, onOpen, onAdvance }) {
  return (
    <div
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '5px',
        padding: '7px 8px', cursor: 'pointer', transition: 'all 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {deployment.employee?.name || `#${deployment.id}`}
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)', marginBottom: 8 }}>
        {deployment.vessel?.name || 'Sem embarcação'}
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        <button onClick={() => onOpen(deployment)} style={actionBtn(true)}>Detalhes</button>
        <button onClick={() => onAdvance(deployment)} style={actionBtn(false)}>Avançar →</button>
      </div>
    </div>
  );
}
