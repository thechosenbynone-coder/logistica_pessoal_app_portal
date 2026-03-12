import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

function formatMetric(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toLocaleString('pt-BR') : fallback;
}

// ─── Componentes base ───────────────────────────────────────────

function SecTitle({ children, sub, action, onAction }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: '12px',
            color: 'var(--text)',
          }}
        >
          {children}
        </div>
        {sub && (
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '9px',
              color: 'var(--muted)',
              letterSpacing: '0.06em',
              marginTop: 2,
            }}
          >
            {sub}
          </div>
        )}
      </div>
      {action && (
        <span
          onClick={onAction}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '9px',
            color: 'var(--amber)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            cursor: 'pointer',
          }}
        >
          {action}
        </span>
      )}
    </div>
  );
}

function Panel({ children, style }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Chip({ tone = 'muted', children }) {
  const tones = {
    muted: {
      background: 'var(--surface2)',
      color: 'var(--muted)',
      border: '1px solid var(--border)',
    },
    red: { background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-dim)' },
    amber: {
      background: 'var(--amber-bg)',
      color: 'var(--amber)',
      border: '1px solid var(--amber-dim)',
    },
    green: {
      background: 'var(--green-bg)',
      color: 'var(--green)',
      border: '1px solid var(--green-dim)',
    },
    blue: {
      background: 'var(--blue-bg)',
      color: 'var(--blue)',
      border: '1px solid var(--blue-dim)',
    },
    orange: {
      background: 'var(--orange-bg)',
      color: 'var(--orange)',
      border: '1px solid var(--orange-dim)',
    },
  };
  return (
    <span
      style={{
        display: 'inline-flex',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '9px',
        borderRadius: '3px',
        padding: '2px 6px',
        letterSpacing: '0.04em',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        ...(tones[tone] || tones.muted),
      }}
    >
      {children}
    </span>
  );
}

// ─── Métrica ────────────────────────────────────────────────────

function Metric({ label, value, hint, tone, icon, onClick }) {
  const colors = {
    red: 'var(--red)',
    amber: 'var(--amber)',
    blue: 'var(--blue)',
    orange: 'var(--orange)',
  };
  const color = colors[tone] || colors.red;
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '14px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border2)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      {/* Barra colorida no topo */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: color,
          borderRadius: '8px 8px 0 0',
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '9px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--muted)',
          }}
        >
          {label}
        </div>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${color}18`,
            color,
          }}
        >
          {icon}
        </div>
      </div>
      <div
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: '30px',
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: '-1.5px',
          color,
          marginBottom: 5,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: '11px',
          color: 'var(--muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: color,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        {hint}
      </div>
    </button>
  );
}

// ─── List Item ───────────────────────────────────────────────────

function ListItem({ dot, name, detail, chip, chipTone }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>{name}</div>
        {detail && (
          <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: 1 }}>{detail}</div>
        )}
      </div>
      {chip && <Chip tone={chipTone}>{chip}</Chip>}
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────

export default function DashboardPage({ onNavigate }) {
  const [metrics, setMetrics] = useState(null);
  const [pendencias, setPendencias] = useState(null);
  const [escalas, setEscalas] = useState(null);
  const [vessels, setVessels] = useState(null);
  const [vesselsUpcoming, setVesselsUpcoming] = useState(null);
  const [activity, setActivity] = useState(null);
  const [embTab, setEmbTab] = useState('ativas');
  const [detailIdx, setDetailIdx] = useState(null);

  const goTo = (url) => {
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
    if (typeof onNavigate === 'function') {
      const key = url.replace(/^\//, '').split('?')[0].split('/')[0] || 'dashboard';
      try {
        onNavigate(key, { rawUrl: url });
      } catch (_) {}
    }
  };

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      api.dashboard.get(),
      api.dashboard.pendencias(),
      api.dashboard.escalas(),
      api.dashboard.vesselsSummary(),
      api.dashboard.vesselsUpcoming(),
      api.dashboard.activity(),
    ]).then(([metricsRes, pendenciasRes, escalasRes, vesselsRes, upcomingRes, activityRes]) => {
      if (!mounted) return;
      setMetrics(metricsRes.status === 'fulfilled' ? metricsRes.value || {} : {});
      setPendencias(pendenciasRes.status === 'fulfilled' ? pendenciasRes.value || [] : []);
      setEscalas(escalasRes.status === 'fulfilled' ? escalasRes.value || null : null);
      setVessels(vesselsRes.status === 'fulfilled' ? vesselsRes.value || [] : []);
      setVesselsUpcoming(upcomingRes.status === 'fulfilled' ? upcomingRes.value || [] : []);
      setActivity(activityRes.status === 'fulfilled' ? activityRes.value || [] : []);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const pills = useMemo(
    () => [
      {
        label: 'Docs Vencidos',
        value: formatMetric(metrics?.documentsExpired, '0'),
        hint: 'Ação imediata',
        tone: 'red',
        onClick: () => onNavigate('docs', { status: 'expired' }),
        icon: (
          <svg
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <line x1="12" y1="11" x2="12" y2="17" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        ),
      },
      {
        label: 'Vencendo em 30d',
        value: formatMetric(metrics?.documentsExpiringSoon, '0'),
        hint: 'Próximos 30 dias',
        tone: 'amber',
        onClick: () => onNavigate('docs', { status: 'expiringSoon' }),
        icon: (
          <svg
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        ),
      },
      {
        label: 'Solicitações',
        value: formatMetric(metrics?.financialRequestsPending, '0'),
        hint: 'Aguardando aprovação',
        tone: 'orange',
        onClick: () => goTo('/requests?status=pending'),
        icon: (
          <svg
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        ),
      },
      {
        label: 'EPI Estoque Baixo',
        value: formatMetric(metrics?.equipmentLowStock, '0'),
        hint:
          metrics === null
            ? '—'
            : metrics.equipmentLowStock === 0
              ? 'Estoque ok'
              : metrics.equipmentLowStock < 5
                ? 'Atenção ao estoque'
                : 'Estoque crítico',
        tone:
          metrics === null
            ? 'muted'
            : metrics.equipmentLowStock === 0
              ? 'blue'
              : metrics.equipmentLowStock < 5
                ? 'amber'
                : 'red',
        onClick: () => goTo('/equipment?filter=low_stock'),
        icon: (
          <svg
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7z" />
          </svg>
        ),
      },
    ],
    [metrics, onNavigate]
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: '20px',
              color: 'var(--text)',
              letterSpacing: '-0.5px',
            }}
          >
            {greeting}, Jéssica
          </div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '9px',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginTop: 3,
            }}
          >
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </div>
        </div>
      </div>

      {/* NÍVEL 1 — 4 métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {pills.map((p) => (
          <Metric
            key={p.label}
            label={p.label}
            value={p.value}
            hint={p.hint}
            tone={p.tone}
            icon={p.icon}
            onClick={p.onClick}
          />
        ))}
      </div>

      {/* NÍVEL 2+3 — grid 2 colunas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <SecTitle
            sub="Requerem ação antes do embarque"
            action="Ver todas →"
            onAction={() => onNavigate('docs')}
          >
            Pendências Críticas
          </SecTitle>
          <Panel>
            <div style={{ padding: '4px 0 0' }}>
              {pendencias === null ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: 44,
                      background: 'var(--surface2)',
                      borderRadius: 4,
                      margin: '6px 0',
                      opacity: 0.5,
                    }}
                  />
                ))
              ) : pendencias.length === 0 ? (
                <div
                  style={{
                    padding: '20px 0',
                    textAlign: 'center',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                    color: 'var(--muted)',
                  }}
                >
                  Nenhuma pendência crítica
                </div>
              ) : (
                pendencias.map((p) => {
                  const isVencido = p.status === 'VENCIDO' || p.overdue;
                  const dot = isVencido ? 'var(--red)' : 'var(--amber)';
                  const tone = isVencido ? 'red' : 'amber';
                  const chip = p.urgencyDays === 0 ? 'Hoje' : `${p.urgencyDays}d`;

                  const deployInfo = p.nextDeploymentDate
                    ? ` · embarque ${new Date(p.nextDeploymentDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
                    : '';

                  return (
                    <ListItem
                      key={p.employeeId}
                      dot={dot}
                      name={p.employeeName}
                      detail={`${p.docType}${deployInfo}`}
                      chip={chip}
                      chipTone={tone}
                    />
                  );
                })
              )}
            </div>
          </Panel>
        </div>

        <div>
          <SecTitle
            sub="29 colaboradores em acompanhamento"
            action="Ver página completa →"
            onAction={() => onNavigate('mobility')}
          >
            Escalas e Embarques
          </SecTitle>
          <Panel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {[
                { label: 'Planejado', color: 'var(--amber)', group: escalas?.planejado },
                { label: 'Embarcado', color: 'var(--blue)', group: escalas?.embarcado },
                { label: 'Desembarque', color: 'var(--green)', group: escalas?.desembarque },
                { label: 'Folga', color: 'var(--muted)', group: escalas?.folga },
              ].map((col, i, arr) => (
                <div
                  key={col.label}
                  onClick={() => onNavigate('mobility')}
                  style={{
                    padding: '20px 16px',
                    textAlign: 'center',
                    borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'var(--muted)',
                      marginBottom: 6,
                    }}
                  >
                    {col.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 800,
                      fontSize: '36px',
                      lineHeight: 1,
                      letterSpacing: '-2px',
                      color: col.color,
                      marginBottom: 8,
                    }}
                  >
                    {escalas === null ? '–' : (col.group?.count ?? 0)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text2)', lineHeight: 1.6 }}>
                    {(col.group?.names ?? []).map((n, idx) => (
                      <div key={idx}>{n}</div>
                    ))}
                    {col.group?.hasMore && (
                      <div style={{ color: 'var(--muted)' }}>+ {(col.group.count ?? 0) - 2}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                padding: '10px 16px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '9px',
                  color: 'var(--muted)',
                }}
              >
                Atualizado agora
              </span>
              <Chip tone="amber">{escalas?.totalOffshore ?? '–'} ativos offshore</Chip>
            </div>
          </Panel>
        </div>
      </div>

      {/* NÍVEL 4 — Embarcações + Atividade Recente */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}
      >
        {/* Embarcações */}
        <div>
          {/* Header Embarcações */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 800,
                  fontSize: '12px',
                  color: 'var(--text)',
                }}
              >
                Embarcações
              </div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '9px',
                  color: 'var(--muted)',
                  letterSpacing: '0.06em',
                  marginTop: 2,
                }}
              >
                Ativas e previstas
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['ativas', 'proximas'].map((t) => (
                <span
                  key={t}
                  onClick={() => setEmbTab(t)}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '9px',
                    borderRadius: '3px',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    ...(embTab === t
                      ? {
                          background: 'var(--blue-bg)',
                          color: 'var(--blue)',
                          border: '1px solid var(--blue-dim)',
                        }
                      : {
                          background: 'var(--surface2)',
                          color: 'var(--muted)',
                          border: '1px solid var(--border)',
                        }),
                  }}
                >
                  {t === 'ativas' ? 'Ativas' : 'Próximas'}
                </span>
              ))}
            </div>
          </div>
          <Panel>
            {embTab === 'ativas' ? (
              vessels === null ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: 44,
                      background: 'var(--surface2)',
                      borderRadius: 4,
                      margin: '6px 16px',
                      opacity: 0.5,
                    }}
                  />
                ))
              ) : vessels.length === 0 ? (
                <div
                  style={{
                    padding: '20px 16px',
                    textAlign: 'center',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                    color: 'var(--muted)',
                  }}
                >
                  Nenhuma embarcação com tripulação ativa
                </div>
              ) : (
                vessels.map((e, i) => (
                  <div
                    key={e.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 16px',
                      borderBottom: i < vessels.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(ev) => (ev.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={(ev) => (ev.currentTarget.style.background = 'transparent')}
                  >
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text)',
                        flex: 1,
                      }}
                    >
                      {e.name}
                    </div>
                    <div style={{ textAlign: 'right', marginRight: 8 }}>
                      <div
                        style={{
                          fontFamily: "'Syne', sans-serif",
                          fontWeight: 800,
                          fontSize: '15px',
                          color: 'var(--text2)',
                        }}
                      >
                        {e.abordo}
                      </div>
                      <div
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '8px',
                          color: 'var(--muted)',
                        }}
                      >
                        a bordo
                      </div>
                    </div>
                    <Chip tone={e.status}>Ativa</Chip>
                  </div>
                ))
              )
            ) : (
              <>
                {vesselsUpcoming === null ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        height: 44,
                        background: 'var(--surface2)',
                        borderRadius: 4,
                        margin: '6px 16px',
                        opacity: 0.5,
                      }}
                    />
                  ))
                ) : vesselsUpcoming.length === 0 ? (
                  <div
                    style={{
                      padding: '20px 16px',
                      textAlign: 'center',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px',
                      color: 'var(--muted)',
                    }}
                  >
                    Nenhum embarque previsto nos próximos 30 dias
                  </div>
                ) : (
                  vesselsUpcoming.map((e, i) => (
                    <div
                      key={e.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 16px',
                        borderBottom:
                          i < vesselsUpcoming.length - 1 ? '1px solid var(--border)' : 'none',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(ev) => (ev.currentTarget.style.background = 'var(--surface2)')}
                      onMouseLeave={(ev) => (ev.currentTarget.style.background = 'transparent')}
                    >
                      <div
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--text)',
                          flex: 1,
                        }}
                      >
                        {e.name}
                      </div>
                      <div style={{ textAlign: 'right', marginRight: 8 }}>
                        <div
                          style={{
                            fontFamily: "'Syne', sans-serif",
                            fontWeight: 800,
                            fontSize: '15px',
                            color: 'var(--text2)',
                          }}
                        >
                          {e.embarque}
                        </div>
                        <div
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '8px',
                            color: 'var(--muted)',
                          }}
                        >
                          embarque
                        </div>
                      </div>
                      <Chip tone={e.gate}>
                        {e.gate === 'green' ? 'Apto' : e.gate === 'red' ? 'Não apto' : 'Atenção'}
                      </Chip>
                    </div>
                  ))
                )}
              </>
            )}
          </Panel>
        </div>

        {/* Atividade Recente */}
        <div>
          <SecTitle>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Atividade Recente
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '9px',
                  color: 'var(--green)',
                  letterSpacing: '0.06em',
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: 'var(--green)',
                    display: 'inline-block',
                    animation: 'pulse 2s infinite',
                  }}
                />
                LIVE
              </span>
            </span>
          </SecTitle>
          <Panel>
            <div style={{ padding: '4px 14px 0' }}>
              {activity === null ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: 44,
                      background: 'var(--surface2)',
                      borderRadius: 4,
                      margin: '6px 0',
                      opacity: 0.5,
                    }}
                  />
                ))
              ) : activity.length === 0 ? (
                <div
                  style={{
                    padding: '20px 0',
                    textAlign: 'center',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                    color: 'var(--muted)',
                  }}
                >
                  Nenhuma atividade recente
                </div>
              ) : (
                activity.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '8px 0',
                      borderBottom: i < activity.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: 'var(--amber)',
                        flexShrink: 0,
                        marginTop: 4,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.5 }}>
                        <strong style={{ fontWeight: 600 }}>{e.user}</strong> {e.action}
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '9px',
                            color: 'var(--muted)',
                            marginLeft: 4,
                          }}
                        >
                          em {e.module}
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '9px',
                          color: 'var(--muted)',
                          marginTop: 1,
                        }}
                      >
                        {e.time} atrás
                      </div>
                    </div>
                    <span
                      onClick={() => setDetailIdx(i)}
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '9px',
                        color: 'var(--amber)',
                        border: '1px solid var(--amber-dim)',
                        background: 'var(--amber-bg)',
                        borderRadius: '3px',
                        padding: '3px 7px',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      Ver
                    </span>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* Modal somente leitura */}
      {detailIdx !== null && activity !== null && (
        <div
          onClick={() => setDetailIdx(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              width: 420,
              maxWidth: '90vw',
              overflow: 'hidden',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 800,
                  fontSize: '13px',
                  color: 'var(--text)',
                }}
              >
                {activity[detailIdx]?.action} — {activity[detailIdx]?.module}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Chip tone="muted">Somente leitura</Chip>
                <button
                  onClick={() => setDetailIdx(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 12, fontSize: '12px', color: 'var(--text2)' }}>
                <strong style={{ color: 'var(--text)' }}>{activity[detailIdx]?.user}</strong> ·{' '}
                {activity[detailIdx]?.time} atrás
              </div>
              {Object.entries(activity[detailIdx]?.detail || {}).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '7px 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '10px',
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      width: 110,
                      flexShrink: 0,
                    }}
                  >
                    {k}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text)' }}>{v}</div>
                </div>
              ))}
              <div
                style={{
                  marginTop: 12,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '9px',
                  color: 'var(--muted)',
                  textAlign: 'center',
                }}
              >
                VISUALIZAÇÃO SOMENTE LEITURA
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
