import React, { useCallback, useEffect, useState } from 'react';
import { panel, tabStyle, secTitle, monoLabel, chip, thStyle, tdStyle, actionBtn } from '../../ui/pageStyles.js';
import apiService from '../../services/api';
import ReviewModal from './ReviewModal';
import SemPreenchimentoTab from './SemPreenchimentoTab';

const statusList = ['Todos', 'PENDENTE', 'EM_REVISAO', 'APROVADO', 'REJEITADO', 'CORRECAO_SOLICITADA'];

const STATUS_LABEL = {
  PENDENTE:             { label: 'Pendente',   tone: 'amber' },
  EM_REVISAO:           { label: 'Em revisão', tone: 'blue' },
  APROVADO:             { label: 'Aprovado',   tone: 'green' },
  REJEITADO:            { label: 'Rejeitado',  tone: 'red' },
  CORRECAO_SOLICITADA:  { label: 'Correção',   tone: 'orange' },
};

export default function WorkPage() {
  const [tab, setTab] = useState('RDOs');
  const [status, setStatus] = useState('Todos');
  const [rdos, setRdos] = useState([]);
  const [oss, setOss] = useState([]);
  const [target, setTarget] = useState(null);

  const load = useCallback(async () => {
    const filter = status === 'Todos' ? {} : { approvalStatus: status };
    setRdos(await apiService.dailyReports.list(filter));
    setOss(await apiService.serviceOrders.list(filter));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const submitReview = async (payload) => {
    if (!target) return;
    if (target.type === 'rdo') await apiService.dailyReports.review(target.id, payload);
    else await apiService.serviceOrders.review(target.id, payload);
    setTarget(null);
    load();
  };

  const list = tab === 'RDOs' ? rdos : oss;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header + tabs principais */}
      <div>
        <div style={{ marginBottom: 12 }}>
          <div style={secTitle()}>Painel de Ação</div>
          <div style={monoLabel({ marginTop: 2 })}>Revisão de RDOs e Ordens de Serviço</div>
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {['RDOs', 'OSs', 'Sem Preenchimento'].map(t => (
            <span key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>{t}</span>
          ))}
        </div>
      </div>

      {tab === 'Sem Preenchimento' ? (
        <div style={panel({ padding: 16 })}>
          <SemPreenchimentoTab />
        </div>
      ) : (
        <>
          {/* Filtros de status */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {statusList.map(s => (
              <span
                key={s}
                onClick={() => setStatus(s)}
                style={tabStyle(status === s)}
              >
                {s === 'Todos' ? 'Todos' : (STATUS_LABEL[s]?.label || s)}
              </span>
            ))}
          </div>

          {/* Tabela */}
          <div style={panel()}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Colaborador / Descrição</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '32px', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Nenhum registro encontrado
                      </td>
                    </tr>
                  ) : list.map(item => {
                    const s = item.approval_status || 'PENDENTE';
                    const meta = STATUS_LABEL[s] || { label: s, tone: 'muted' };
                    const rowBorder = meta.tone === 'red' ? 'var(--red)' : meta.tone === 'amber' ? 'var(--amber)' : meta.tone === 'green' ? 'var(--green)' : 'transparent';
                    return (
                      <tr
                        key={item.id}
                        style={{ borderBottom: '1px solid var(--border)', borderLeft: `2px solid ${rowBorder}`, cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={tdStyle()}>{item.description || item.title || `#${item.id}`}</td>
                        <td style={tdStyle()}>
                          <span style={chip(meta.tone)}>{meta.label}</span>
                        </td>
                        <td style={tdStyle()}>
                          <button
                            onClick={() => setTarget({ id: item.id, type: tab === 'RDOs' ? 'rdo' : 'os' })}
                            style={actionBtn(s === 'APROVADO' || s === 'REJEITADO')}
                          >
                            {s === 'APROVADO' || s === 'REJEITADO' ? 'Ver' : 'Revisar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ReviewModal open={!!target} onClose={() => setTarget(null)} onSubmit={submitReview} />
    </div>
  );
}
