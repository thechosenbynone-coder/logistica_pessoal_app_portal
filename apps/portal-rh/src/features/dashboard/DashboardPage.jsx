import React, { useEffect, useMemo, useState } from 'react';
import Badge from '../../ui/Badge.jsx';
import Card from '../../ui/Card.jsx';
import api from '../../services/api';

function formatMetric(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toLocaleString('pt-BR') : fallback;
}

function PulseDot({ className }) {
  return <span className={`inline-flex h-2.5 w-2.5 animate-pulse rounded-full ${className}`} />;
}

function BentoPill({ title, value, subtitle, dotClass, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-5 text-left shadow-md backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-60" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-2 text-3xl font-bold leading-none text-slate-900">{value}</p>
        </div>
        <div className="rounded-xl bg-slate-900/5 p-2 text-slate-700">{icon}</div>
      </div>
      <div className="relative mt-4 flex items-center gap-2">
        <PulseDot className={dotClass} />
        <p className="text-xs font-medium text-slate-500">{subtitle}</p>
      </div>
    </button>
  );
}

export default function DashboardPage({ onNavigate }) {
  const [metrics, setMetrics] = useState(null);

  const goTo = (url) => {
    const safeUrl = String(url || '/');
    window.history.pushState({}, '', safeUrl);
    window.dispatchEvent(new PopStateEvent('popstate'));
    if (typeof onNavigate === 'function') {
      const key = safeUrl.replace(/^\//, '').split('?')[0].split('/')[0] || 'dashboard';
      try {
        onNavigate(key, { rawUrl: safeUrl });
      } catch (_) {}
    }
  };

  useEffect(() => {
    let mounted = true;
    api.dashboard
      .get()
      .then((data) => {
        if (!mounted) return;
        setMetrics(data || {});
      })
      .catch(() => {
        if (!mounted) return;
        setMetrics({});
      });

    return () => {
      mounted = false;
    };
  }, []);

  const attentionPills = useMemo(
    () => [
      {
        title: 'Docs Vencidos',
        value: formatMetric(metrics?.documentsExpired, '0'),
        subtitle: 'Requer ação imediata',
        dotClass: 'bg-red-500',
        go: () => onNavigate('docs', { status: 'expired' }),
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 7.5a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
        )
      },
      {
        title: 'Docs Vencendo',
        value: formatMetric(metrics?.documentsExpiringSoon, '0'),
        subtitle: 'Vencem em até 30 dias',
        dotClass: 'bg-yellow-500',
        go: () => onNavigate('docs', { status: 'expiringSoon' }),
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 6h10l4 4v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
            <path d="M14 6v4h4" />
          </svg>
        )
      },
      {
        title: 'Solicitações Pendentes',
        value: formatMetric(metrics?.financialRequestsPending, '0'),
        subtitle: 'Aguardando aprovação',
        dotClass: 'bg-blue-500',
        go: () => goTo('/requests?status=pending'),
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
            <path d="M10 18a2 2 0 0 0 4 0" />
          </svg>
        )
      },
      {
        title: 'EPI Estoque Baixo',
        value: formatMetric(metrics?.equipmentLowStock, '3'),
        subtitle: 'Estoque mínimo atingido',
        dotClass: 'bg-orange-500',
        go: () => goTo('/equipment?filter=low_stock'),
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 13a8 8 0 0 1 16 0" />
            <path d="M6 13v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2" />
            <path d="M10 9V6h4v3" />
          </svg>
        )
      }
    ],
    [metrics, onNavigate]
  );

  const tacticalTrips = useMemo(
    () => [
      {
        worker: 'Carlos Silva',
        movement: 'Sobe',
        time: '07:30',
        transport: 'Plataforma P-58',
        status: 'Confirmado',
        tone: 'green'
      },
      {
        worker: 'Fernanda Rocha',
        movement: 'Desce',
        time: '09:10',
        transport: 'Navio Vitória',
        status: 'Checklist pendente',
        tone: 'yellow'
      },
      {
        worker: 'Rafael Costa',
        movement: 'Sobe',
        time: '13:45',
        transport: 'Plataforma P-65',
        status: 'Documento crítico',
        tone: 'red'
      },
      {
        worker: 'Aline Mendes',
        movement: 'Desce',
        time: '18:20',
        transport: 'Heliporto Base Sul',
        status: 'Aguardando transporte',
        tone: 'blue'
      }
    ],
    []
  );

  const activities = useMemo(
    () => [
      { action: 'Maria aprovou o RDO #102', at: 'Hoje, 08:14' },
      { action: 'João alterou o estado do ASO de Carlos', at: 'Hoje, 09:02' },
      { action: 'Paula anexou documentação de embarque', at: 'Hoje, 10:27' },
      { action: 'Financeiro marcou solicitação #448 como pendente', at: 'Hoje, 11:41' }
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-slate-900">Olá, Jéssica 👋</h1>
        <p className="text-slate-500 mt-1">O que faremos hoje?</p>
      </div>


      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {attentionPills.map((pill) => (
          <BentoPill key={pill.title} {...pill} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Visão Tática de Movimentação</h2>
            <Badge tone="blue">Hoje</Badge>
          </div>

          <div className="space-y-3">
            {tacticalTrips.map((trip) => (
              <div
                key={`${trip.worker}-${trip.time}`}
                className="rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-md transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800">{trip.worker}</p>
                  <Badge tone={trip.tone}>{trip.status}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="rounded-lg bg-slate-100 px-2 py-1 font-medium text-slate-700">{trip.movement}</span>
                  <span>•</span>
                  <span>{trip.time}</span>
                  <span>•</span>
                  <span>{trip.transport}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-900">Atividades Recentes</h2>

          <div className="mt-5 space-y-5">
            {activities.map((item, index) => (
              <div key={item.action} className="relative pl-5">
                {index !== activities.length - 1 && (
                  <span className="absolute left-[5px] top-2 h-[calc(100%+16px)] w-px bg-slate-200" />
                )}
                <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
                <p className="text-sm font-medium text-slate-800">{item.action}</p>
                <p className="mt-1 text-xs text-slate-500">{item.at}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
