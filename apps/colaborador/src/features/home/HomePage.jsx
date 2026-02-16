import React, { useMemo } from 'react';
import { ArrowRight, Briefcase, CalendarDays, ClipboardList, History, Shield, User, Wallet } from 'lucide-react';
import { formatDateBR } from '../../utils';

function LandingCard({ title, description, onClick, icon: Icon, badge, count, large = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:shadow-md ${large ? 'p-5' : 'p-4'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500">{description}</p>
          <h3 className={`font-semibold text-slate-800 ${large ? 'mt-1 text-xl' : 'mt-0.5 text-base'}`}>{title}</h3>
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

export function HomePage({ employee, nextTrip, osCount, rdoCount, onOpenTrip, onOpenOs, onOpenRdo, onOpenEpis, onOpenFinance, onOpenProfile, onOpenHistory, onCheckInOut }) {
  const firstName = useMemo(() => employee?.name?.trim()?.split(' ')?.[0] || 'Colaborador', [employee]);

  return (
    <div className="space-y-4 pb-4">
      <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white shadow">
        <p className="text-xs font-medium tracking-wide text-blue-100">MENU PRINCIPAL</p>
        <h1 className="mt-1 text-2xl font-bold">Olá, {firstName}</h1>
        <p className="mt-1 text-sm text-blue-100">Escolha uma opção para continuar.</p>
      </section>

      <LandingCard
        large
        title="Próximo embarque"
        description={nextTrip?.location || 'Local não informado'}
        onClick={onOpenTrip}
        icon={CalendarDays}
        badge={nextTrip?.embarkDate ? formatDateBR(nextTrip.embarkDate) : 'Sem data'}
      />

      <LandingCard
        title="Check-in / Check-out"
        description="Registrar ponto agora"
        onClick={onCheckInOut || (() => {})}
        icon={ClipboardList}
      />

      <section className="grid grid-cols-2 gap-3">
        <LandingCard title="OS e RDO" description="Ordens e relatórios" onClick={onOpenOs || onOpenRdo} icon={Briefcase} count={(osCount || 0) + (rdoCount || 0)} />
        <LandingCard title="EPIs" description="Equipamentos" onClick={onOpenEpis} icon={Shield} />
      </section>

      <section className="grid grid-cols-2 gap-3">
        <LandingCard title="Financeiro" description="Solicitações" onClick={onOpenFinance} icon={Wallet} />
        <LandingCard title="Perfil" description="Dados do colaborador" onClick={onOpenProfile} icon={User} />
      </section>

      {onOpenHistory ? (
        <LandingCard title="Histórico" description="Embarques anteriores" onClick={onOpenHistory} icon={History} />
      ) : null}

      <p className="px-1 text-xs text-slate-500">RDO do dia: {rdoCount || 0} • OS ativas: {osCount || 0}</p>
    </div>
  );
}
