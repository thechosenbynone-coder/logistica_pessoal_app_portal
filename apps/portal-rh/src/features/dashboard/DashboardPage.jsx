import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, FileWarning, FileX2, Plane, Users, Wallet } from 'lucide-react';
import Card from '../../ui/Card.jsx';
import api from '../../services/api';

function formatMetric(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toLocaleString('pt-BR') : 'x';
}

function MetricCard({ title, value, icon: Icon, onClick }) {
  const clickable = typeof onClick === 'function';
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition ' +
        (clickable ? 'hover:-translate-y-0.5 hover:shadow-md' : '')
      }
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <Icon size={18} className="text-slate-400" />
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900">{formatMetric(value)}</p>
    </button>
  );
}

export default function DashboardPage({ onNavigate }) {
  const [metrics, setMetrics] = useState(null);

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

  const cards = useMemo(
    () => [
      {
        title: 'Colaboradores',
        value: metrics?.employeesTotal,
        icon: Users,
        go: () => onNavigate?.('employees')
      },
      {
        title: 'Embarques Ativos',
        value: metrics?.activeDeployments,
        icon: Plane,
        go: () => onNavigate?.('mobility')
      },
      {
        title: 'Documentos Vencidos',
        value: metrics?.documentsExpired,
        icon: FileX2,
        go: () => onNavigate?.('docs', { status: 'expired' })
      },
      {
        title: 'Documentos Atenção',
        value: metrics?.documentsExpiringSoon,
        icon: FileWarning,
        go: () => onNavigate?.('docs', { status: 'expiringSoon' })
      },
      {
        title: 'Vence durante embarque',
        value: metrics?.documentsExpiringDuringDeployment,
        icon: FileWarning,
        go: () => onNavigate?.('docs', { status: 'duringDeployment' })
      },
      {
        title: 'Solicitações Financeiras Pendentes',
        value: metrics?.financialRequestsPending,
        icon: Wallet,
        go: () => onNavigate?.('finance', { status: 'pending' })
      },
      {
        title: 'RDO pendente',
        value: metrics?.dailyReportsPending,
        icon: ClipboardList,
        go: () => onNavigate?.('rdo', { status: 'pending' })
      }
    ],
    [metrics, onNavigate]
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard RH</h1>
        <p className="mt-1 text-sm text-slate-500">Métricas em tempo real da API operacional.</p>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <MetricCard key={card.title} title={card.title} value={card.value} icon={card.icon} onClick={card.go} />
        ))}
      </div>
    </div>
  );
}
