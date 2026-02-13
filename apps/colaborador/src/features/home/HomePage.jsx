import React, { useMemo } from 'react';
import { ArrowRight, Briefcase, CalendarDays, ClipboardList, FileText, Shield, User, Wallet } from 'lucide-react';
import { formatDateBR } from '../../utils';

function StatusChip({ status }) {
  const tone = status === 'Confirmado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
}

function ActionCard({ title, description, onClick, icon: Icon, badge, count, large = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:shadow-md ${large ? 'p-5' : 'p-4'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500">{description}</p>
          <h3 className={`font-semibold text-slate-800 ${large ? 'text-xl mt-1' : 'text-base mt-0.5'}`}>{title}</h3>
          {typeof count === 'number' ? <p className="mt-2 text-2xl font-bold text-slate-900">{count}</p> : null}
          {badge ? <span className="mt-2 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">{badge}</span> : null}
        </div>
        <div className="rounded-xl bg-slate-100 p-2">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </div>
      <div className="mt-3 flex items-center text-sm font-medium text-blue-600">
        Acessar <ArrowRight className="ml-1 h-4 w-4" />
      </div>
    </button>
  );
}

export function HomePage({ employee, nextTrip, osCount, rdoCount, onOpenTrip, onOpenOs, onOpenRdo, onOpenEpis, onOpenFinance, onOpenProfile, onCheckInOut }) {
  const firstName = useMemo(() => employee?.name?.trim()?.split(' ')?.[0] || 'Carlos', [employee]);
  const todayLabel = useMemo(() => {
    const parts = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    }).format(new Date());
    return parts.toUpperCase();
  }, []);

  return (
    <div className="space-y-4 pb-4">
      <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white shadow">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-blue-100">{todayLabel}</p>
            <h1 className="mt-1 text-2xl font-bold">Olá, {firstName}</h1>
          </div>
          <img
            src={employee?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=0D47A1&color=fff&size=96`}
            alt={`Avatar de ${firstName}`}
            className="h-12 w-12 rounded-full border-2 border-white/70 object-cover"
          />
        </div>
      </section>

      <button onClick={onOpenTrip} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Próximo Embarque</h2>
          <StatusChip status={nextTrip?.status || 'Confirmado'} />
        </div>
        <p className="text-lg font-semibold text-slate-900">{nextTrip?.destination || 'Embarque não definido'}</p>
        <p className="mt-1 text-sm text-slate-600">{nextTrip?.location || 'Local não informado'}</p>
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <CalendarDays className="h-4 w-4" /> {nextTrip?.embarkDate ? formatDateBR(nextTrip.embarkDate) : 'Sem data'}
        </div>
        <p className="mt-3 text-sm font-semibold text-blue-700">{nextTrip?.daysRemaining ?? 0} dias restantes</p>
      </button>

      <ActionCard
        large
        title="Check-in / Check-out"
        description="Registrar ponto agora"
        onClick={onCheckInOut}
        icon={ClipboardList}
      />

      <section className="grid grid-cols-2 gap-3">
        <ActionCard title="Ordens de Serviço" description="OS em andamento" onClick={onOpenOs} icon={Briefcase} count={osCount} badge={`${osCount} Ativas`} />
        <ActionCard title="Relatórios (RDO)" description="Registros do dia" onClick={onOpenRdo} icon={FileText} count={rdoCount} />
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Acesso Rápido</h2>
        <div className="grid grid-cols-3 gap-3">
          <ActionCard title="EPIs" description="Itens" onClick={onOpenEpis} icon={Shield} />
          <ActionCard title="Financeiro" description="Solicitações" onClick={onOpenFinance} icon={Wallet} />
          <ActionCard title="Perfil" description="Dados" onClick={onOpenProfile} icon={User} />
        </div>
      </section>
    </div>
  );
}
