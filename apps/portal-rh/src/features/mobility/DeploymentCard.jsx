import React from 'react';
import { actionBtn } from '../../ui/pageStyles.js';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function DeploymentCard({ deployment, onOpen, onAdvance }) {
  const title = deployment.vessel?.name || `Embarque #${deployment.id}`;
  const subtitle = deployment.service_type || deployment.vessel?.type || 'Sem tipo de serviço';
  const period = `${formatDate(deployment.start_date)} → ${formatDate(deployment.end_date_expected)}`;
  const hasEmployee = Boolean(deployment.employee?.name);

  return (
    <div
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '5px',
        padding: '8px 10px', cursor: 'pointer', transition: 'all 0.12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Título: embarcação */}
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title}
      </div>

      {/* Tipo de serviço */}
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--accent)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {subtitle}
      </div>

      {/* Período */}
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)', marginBottom: hasEmployee ? 3 : 8 }}>
        {period}
      </div>

      {/* Colaborador (se houver) */}
      {hasEmployee && (
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'var(--text2)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          👤 {deployment.employee.name}
        </div>
      )}

      {/* Ações */}
      <div style={{ display: 'flex', gap: 5 }}>
        <button onClick={(e) => { e.stopPropagation(); onOpen(deployment); }} style={actionBtn(true)}>Detalhes</button>
        <button onClick={(e) => { e.stopPropagation(); onAdvance(deployment); }} style={actionBtn(false)}>Avançar →</button>
      </div>
    </div>
  );
}
