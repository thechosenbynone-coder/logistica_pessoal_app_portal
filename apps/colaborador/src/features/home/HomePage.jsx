import React, { useMemo } from 'react';
import { ArrowRight, Briefcase, CalendarDays, ClipboardList, FileText, Shield, User, Wallet } from 'lucide-react';
import { formatDateBR } from '../../utils';

function StatusChip({ status }) {
  const tone = status === 'Confirmado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
}

function ActionCard({ title, description, onClick, icon: Icon, count, large = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:shadow-md ${large ? 'p-5' : 'p-4'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{description}</p>
          <h3 className={`font-semibold text-slate-800 ${large ? 'text-xl mt-1' : 'text-base mt-0.5'}`}>{title}</h3>
          {typeof count === 'number' ? <p className="mt-2 text-2xl font-bold text-slate-900">{count}</p> : null}
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

export function HomePage({ employeeName, nextTrip, osCount, rdoCount, onNavigate, onCheckInOut }) {
  const firstName = useMemo(() => employeeName?.trim()?.split(' ')?.[0] || 'Colaborador', [employeeName]);

  return (
    <div className="space-y-4 pb-4">
      <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white shadow">
        <p className="text-sm text-blue-100">Portal do Colaborador</p>
        <h1 className="mt-1 text-2xl font-bold">Olá, {firstName}</h1>
        <p className="mt-1 text-sm text-blue-100">Organize sua rotina de embarque e operações.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
      </section>

      <ActionCard
        large
        title="Check-in / Check-out"
        description="Registro rápido de presença"
        onClick={onCheckInOut}
        icon={ClipboardList}
      />

      <section className="grid grid-cols-2 gap-3">
        <ActionCard title="Ordens de Serviço" description="OS em andamento" onClick={() => onNavigate('work')} icon={Briefcase} count={osCount} />
        <ActionCard title="Relatórios (RDO)" description="RDOs pendentes" onClick={() => onNavigate('work')} icon={FileText} count={rdoCount} />
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Acesso Rápido</h2>
        <div className="grid grid-cols-3 gap-3">
          <ActionCard title="EPIs" description="Itens e status" onClick={() => onNavigate('epis')} icon={Shield} />
          <ActionCard title="Financeiro" description="Solicitações" onClick={() => onNavigate('finance')} icon={Wallet} />
          <ActionCard title="Perfil" description="Dados pessoais" onClick={() => onNavigate('profile')} icon={User} />
        </div>
      </section>
    </div>
  );
}
