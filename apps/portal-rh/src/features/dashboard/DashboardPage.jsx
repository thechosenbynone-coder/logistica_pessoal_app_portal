import React, { useEffect, useMemo, useState } from 'react';
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

      <section className="grid grid-cols-1 gap-6">
        <Card className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-900">Atividades Recentes</h2>

          <div className="mt-5 flex items-center justify-center py-8 text-sm text-slate-400">
            Nenhuma atividade registrada.
          </div>
        </Card>
      </section>
    </div>
  );
}
