import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

function formatMetric(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toLocaleString('pt-BR') : fallback;
}

// ─── Componentes base ───────────────────────────────────────────

function SecTitle({ children, sub, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
      <div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--text)' }}>
          {children}
        </div>
        {sub && (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.06em', marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
      {action && (
        <span
          onClick={onAction}
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer' }}
        >
          {action}
        </span>
      )}
    </div>
  );
}

function Panel({ children, style }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  );
}

function Chip({ tone = 'muted', children }) {
  const tones = {
    muted:  { background: 'var(--surface2)', color: 'var(--muted)',  border: '1px solid var(--border)' },
    red:    { background: 'var(--red-bg)',   color: 'var(--red)',    border: '1px solid var(--red-dim)' },
    amber:  { background: 'var(--amber-bg)', color: 'var(--amber)',  border: '1px solid var(--amber-dim)' },
    green:  { background: 'var(--green-bg)', color: 'var(--green)',  border: '1px solid rgba(34,197,94,0.2)' },
    blue:   { background: 'var(--blue-bg)',  color: 'var(--blue)',   border: '1px solid rgba(96,165,250,0.2)' },
    orange: { background: 'var(--orange-bg)',color: 'var(--orange)', border: '1px solid rgba(251,146,60,0.2)' },
  };
  return (
    <span style={{
      display: 'inline-flex',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '9px', borderRadius: '3px', padding: '2px 6px',
      letterSpacing: '0.04em', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0,
      ...(tones[tone] || tones.muted),
    }}>
      {children}
    </span>
  );
}

// ─── Métrica ────────────────────────────────────────────────────

function Metric({ label, value, hint, tone, icon, onClick }) {
  const colors = {
    red:    'var(--red)',
    amber:  'var(--amber)',
    blue:   'var(--blue)',
    orange: 'var(--orange)',
  };
  const color = colors[tone] || colors.red;
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px',
        padding: '14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
        position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Barra colorida no topo */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color, borderRadius: '8px 8px 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
          {label}
        </div>
        <div style={{ width: 26, height: 26, borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}18`, color }}>
          {icon}
        </div>
      </div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '30px', fontWeight: 800, lineHeight: 1, letterSpacing: '-1.5px', color, marginBottom: 5 }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
        {hint}
      </div>
    </button>
  );
}

// ─── Card Kanban ─────────────────────────────────────────────────

function KCol({ title, count, children }) {
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', minHeight: 120 }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 7, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {title}
        <span style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '3px', padding: '0 4px', color: 'var(--text2)', fontSize: '9px' }}>{count}</span>
      </div>
      {children}
    </div>
  );
}

function KCard({ name, meta, gate }) {
  const gateColor = gate === 'ok' ? 'var(--green)' : gate === 'warn' ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '5px',
      padding: '7px 8px', marginBottom: 5, cursor: 'pointer', transition: 'all 0.12s',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>
        {name}
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: gateColor, flexShrink: 0 }} />
        {meta}
      </div>
    </div>
  );
}

// ─── List Item ───────────────────────────────────────────────────

function ListItem({ dot, text, chip, chipTone, meta }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      <div style={{ flex: 1, fontSize: '12px', color: 'var(--text)', lineHeight: 1.4 }}>{text}</div>
      {chip && <Chip tone={chipTone}>{chip}</Chip>}
      {meta && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)' }}>{meta}</div>}
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────

const ESCALAS_DATA = {
  planejado: [
    { name: 'M. Ferreira', meta: 'P-74 · 12/03', gate: 'warn' },
    { name: 'R. Almeida',  meta: 'FPSO · 15/03', gate: 'ok' },
    { name: 'T. Santos',   meta: 'NS-42 · 18/03', gate: 'ok' },
    { name: 'C. Oliveira', meta: 'P-58 · 10/03', gate: 'ok' },
    { name: 'A. Lima',     meta: 'P-09 · 11/03', gate: 'warn' },
  ],
  embarcado: [
    { name: 'F. Costa',  meta: 'P-74', gate: 'bad' },
    { name: 'G. Pereira',meta: 'NS-18', gate: 'ok' },
    { name: 'H. Nunes',  meta: 'FPSO SBM', gate: 'ok' },
    { name: 'L. Dias',   meta: 'P-09', gate: 'ok' },
  ],
  desembarque: [
    { name: 'B. Souza',   meta: 'P-58 · 01/03', gate: 'ok' },
    { name: 'S. Freitas', meta: 'P-74 · 28/02', gate: 'ok' },
    { name: 'J. Rocha',   meta: 'FPSO ESS · 04/03', gate: 'ok' },
    { name: 'P. Mendes',  meta: 'P-12 · 04/03', gate: 'warn' },
  ],
  folga: [
    { name: 'K. Melo',    meta: 'retornou 28/02', gate: 'ok' },
    { name: 'D. Barros',  meta: 'retornou 01/03', gate: 'ok' },
    { name: 'E. Teixeira',meta: 'retornou 02/03', gate: 'ok' },
  ],
};

const EMBARCACOES_ATIVAS = [
  { nome: 'Plataforma P-74', abordo: 8, status: 'green' },
  { nome: 'FPSO SBM',        abordo: 5, status: 'green' },
  { nome: 'Sonda NS-18',     abordo: 3, status: 'green' },
  { nome: 'Plataforma P-09', abordo: 4, status: 'green' },
  { nome: 'FPSO ESS',        abordo: 2, status: 'amber' },
];

const EMBARCACOES_PROXIMAS = [
  { nome: 'Plataforma P-58', embarque: '10/03', gate: 'green' },
  { nome: 'Plataforma P-09', embarque: '11/03', gate: 'red' },
  { nome: 'Plataforma P-74', embarque: '12/03', gate: 'amber' },
  { nome: 'FPSO SBM',        embarque: '15/03', gate: 'green' },
  { nome: 'Sonda NS-42',     embarque: '18/03', gate: 'green' },
];

const FEED_EVENTS = [
  { user: 'Maria S.',  action: 'criou solicitação',       module: 'Solicitações', time: '1min',
    detail: { Tipo: 'Adiantamento salarial', Colaborador: 'P. Mendes', Valor: 'R$ 800,00', Status: 'Pendente' } },
  { user: 'Carlos R.', action: 'atualizou documento',     module: 'Documentações', time: '4min',
    detail: { Documento: 'ASO Anual', Colaborador: 'R. Almeida', Validade: '05/03/2027' } },
  { user: 'Jéssica',   action: 'avançou embarque',        module: 'Escalas', time: '12min',
    detail: { Colaborador: 'C. Oliveira', De: 'Confirmado', Para: 'Embarcado', Embarcação: 'P-58' } },
  { user: 'Maria S.',  action: 'aprovou RDO',             module: 'RDOs', time: '28min',
    detail: { Colaborador: 'J. Rocha', Embarcação: 'FPSO ESS', Horas: '10h' } },
  { user: 'Carlos R.', action: 'registrou entrega de EPI',module: 'EPIs', time: '41min',
    detail: { Colaborador: 'T. Santos', Itens: 'Capacete · Luva NR-6', Status: 'Aguardando assinatura' } },
];

export default function DashboardPage({ onNavigate }) {
  const [metrics, setMetrics] = useState(null);
  const [embTab, setEmbTab] = useState('ativas');
  const [detailIdx, setDetailIdx] = useState(null);

  const goTo = (url) => {
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  useEffect(() => {
    let mounted = true;
    api.dashboard.get()
      .then(data => { if (mounted) setMetrics(data || {}); })
      .catch(() => { if (mounted) setMetrics({}); });
    return () => { mounted = false; };
  }, []);

  const pills = useMemo(() => [
    { label: 'Docs Vencidos',   value: formatMetric(metrics?.documentsExpired, '0'),        hint: 'Ação imediata',      tone: 'red',    onClick: () => onNavigate('docs', { status: 'expired' }),
      icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> },
    { label: 'Vencendo em 30d', value: formatMetric(metrics?.documentsExpiringSoon, '0'),   hint: 'Próximos 30 dias',   tone: 'amber',  onClick: () => onNavigate('docs', { status: 'expiringSoon' }),
      icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
    { label: 'Solicitações',    value: formatMetric(metrics?.financialRequestsPending, '0'), hint: 'Aguardando aprovação',tone: 'blue',   onClick: () => goTo('/requests?status=pending'),
      icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
    { label: 'EPI Estoque Baixo',value: formatMetric(metrics?.equipmentLowStock, '0'),      hint: 'Estoque mínimo',     tone: 'orange', onClick: () => goTo('/equipment?filter=low_stock'),
      icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7z"/></svg> },
  ], [metrics, onNavigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* NÍVEL 1 — 4 métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {pills.map(p => <Metric key={p.label} label={p.label} value={p.value} hint={p.hint} tone={p.tone} icon={p.icon} onClick={p.onClick} />)}
      </div>

      {/* NÍVEL 2 — Pendências Críticas */}
      <div>
        <SecTitle sub="Requerem ação antes do embarque" action="Ver todas →" onAction={() => onNavigate('docs')}>
          Pendências Críticas
        </SecTitle>
        <Panel>
          <div style={{ padding: '4px 14px 0' }}>
            <ListItem dot="var(--red)"   text="M. Ferreira — ASO vencido"         chip="Hoje" chipTone="red" />
            <ListItem dot="var(--red)"   text="C. Oliveira — NR-33 expirado"       chip="2d"   chipTone="red" />
            <ListItem dot="var(--red)"   text="A. Lima — EPI sem assinatura"       chip="2d"   chipTone="red" />
            <ListItem dot="var(--amber)" text="J. Rocha — RDO pendente revisão"    chip="5d"   chipTone="amber" />
            <ListItem dot="var(--amber)" text="P. Mendes — solicitação #482"       chip="7d"   chipTone="amber" />
          </div>
        </Panel>
      </div>

      {/* NÍVEL 3 — Escalas e Embarques */}
      <div>
        <SecTitle sub="29 colaboradores em acompanhamento" action="Ver página completa →" onAction={() => onNavigate('mobility')}>
          Escalas e Embarques
        </SecTitle>
        <Panel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: 12 }}>
            <KCol title="Embarque Planejado" count={ESCALAS_DATA.planejado.length}>
              {ESCALAS_DATA.planejado.map(c => <KCard key={c.name} {...c} />)}
            </KCol>
            <KCol title="Embarcado" count={ESCALAS_DATA.embarcado.length}>
              {ESCALAS_DATA.embarcado.map(c => <KCard key={c.name} {...c} />)}
            </KCol>
            <KCol title="Desembarque" count={ESCALAS_DATA.desembarque.length}>
              {ESCALAS_DATA.desembarque.map(c => <KCard key={c.name} {...c} />)}
            </KCol>
            <KCol title="Folga" count={ESCALAS_DATA.folga.length}>
              {ESCALAS_DATA.folga.map(c => <KCard key={c.name} {...c} />)}
            </KCol>
          </div>
        </Panel>
      </div>

      {/* NÍVEL 4 — Embarcações + Atividade Recente */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>

        {/* Embarcações */}
        <div>
          <SecTitle sub="Ativas e previstas">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Embarcações
              <span style={{ display: 'flex', gap: 4 }}>
                {['ativas', 'proximas'].map(t => (
                  <span key={t} onClick={() => setEmbTab(t)} style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
                    borderRadius: '3px', padding: '2px 6px', cursor: 'pointer', fontWeight: 500,
                    ...(embTab === t
                      ? { background: 'var(--blue-bg)', color: 'var(--blue)', border: '1px solid rgba(96,165,250,0.2)' }
                      : { background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' })
                  }}>
                    {t === 'ativas' ? 'Ativas' : 'Próximas'}
                  </span>
                ))}
              </span>
            </span>
          </SecTitle>
          <Panel>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {embTab === 'ativas'
                  ? EMBARCACOES_ATIVAS.map((e, i) => (
                    <tr key={e.nome} style={{ borderBottom: i < EMBARCACOES_ATIVAS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '9px 12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>{e.nome}</td>
                      <td style={{ padding: '9px 12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--text2)', textAlign: 'right' }}>{e.abordo}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right' }}><Chip tone={e.status}>Ativa</Chip></td>
                    </tr>
                  ))
                  : EMBARCACOES_PROXIMAS.map((e, i) => (
                    <tr key={e.nome} style={{ borderBottom: i < EMBARCACOES_PROXIMAS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '9px 12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>{e.nome}</td>
                      <td style={{ padding: '9px 12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--text2)' }}>{e.embarque}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right' }}><Chip tone={e.gate}>{e.gate === 'green' ? 'Apto' : e.gate === 'red' ? 'Não apto' : 'Atenção'}</Chip></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </Panel>
        </div>

        {/* Atividade Recente */}
        <div>
          <SecTitle>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Atividade Recente
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--green)', letterSpacing: '0.06em' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                LIVE
              </span>
            </span>
          </SecTitle>
          <Panel>
            <div style={{ padding: '4px 14px 0' }}>
              {FEED_EVENTS.map((e, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: i < FEED_EVENTS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0, marginTop: 4 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.5 }}>
                      <strong style={{ fontWeight: 600 }}>{e.user}</strong> {e.action}
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)', marginLeft: 4 }}>em {e.module}</span>
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)', marginTop: 1 }}>{e.time} atrás</div>
                  </div>
                  <span
                    onClick={() => setDetailIdx(i)}
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--amber)',
                      border: '1px solid var(--amber-dim)', background: 'var(--amber-bg)',
                      borderRadius: '3px', padding: '3px 7px', cursor: 'pointer', textTransform: 'uppercase',
                      letterSpacing: '0.06em', flexShrink: 0, marginTop: 2,
                    }}
                  >
                    Ver
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Modal somente leitura */}
      {detailIdx !== null && (
        <div
          onClick={() => setDetailIdx(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px',
            width: 420, maxWidth: '90vw', overflow: 'hidden', boxShadow: 'var(--shadow)',
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: 'var(--text)' }}>
                {FEED_EVENTS[detailIdx]?.action} — {FEED_EVENTS[detailIdx]?.module}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Chip tone="muted">Somente leitura</Chip>
                <button onClick={() => setDetailIdx(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 12, fontSize: '12px', color: 'var(--text2)' }}>
                <strong style={{ color: 'var(--text)' }}>{FEED_EVENTS[detailIdx]?.user}</strong> · {FEED_EVENTS[detailIdx]?.time} atrás
              </div>
              {Object.entries(FEED_EVENTS[detailIdx]?.detail || {}).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', width: 110, flexShrink: 0 }}>{k}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text)' }}>{v}</div>
                </div>
              ))}
              <div style={{ marginTop: 12, fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)', textAlign: 'center' }}>
                VISUALIZAÇÃO SOMENTE LEITURA
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
