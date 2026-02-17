import React, { useMemo } from 'react';
import { ArrowRight, Briefcase, PlaneTakeoff } from 'lucide-react';
import { formatDateBR } from '../../utils';

function CompactBadge({ label, value, tone = 'default' }) {
  const toneClass = {
    default: 'bg-slate-100 text-slate-700',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-rose-100 text-rose-700',
  }[tone];

  return (
    <div className={`rounded-lg px-2.5 py-2 text-center ${toneClass}`}>
      <p className="text-[11px] font-medium">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </div>
  );
}

export function HomePage({ employee, tripSummary, approvalSummary, onOpenTrip, onOpenWork }) {
  const firstName = useMemo(() => employee?.name?.trim()?.split(' ')?.[0] || 'Colaborador', [employee]);

  return (
    <div className="space-y-4 pb-20">
      <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white shadow">
        <p className="text-xs font-medium tracking-wide text-blue-100">COCKPIT</p>
        <h1 className="mt-1 text-2xl font-bold">Olá, {firstName}</h1>
        <p className="mt-1 text-sm text-blue-100">Acompanhe seu embarque e pendências operacionais.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Card vital</p>
            <h2 className="text-lg font-semibold text-slate-900">Meu embarque</h2>
          </div>
          <PlaneTakeoff className="h-5 w-5 text-blue-600" />
        </div>

        <div className="space-y-1 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">{tripSummary.destination || 'Destino não informado'}</p>
          <p>{tripSummary.location || 'Local não informado'}</p>
          <p>
            {tripSummary.embarkDate ? formatDateBR(tripSummary.embarkDate) : 'Sem data'}
            {' • '}
            {tripSummary.disembarkDate ? formatDateBR(tripSummary.disembarkDate) : 'Sem retorno'}
          </p>
          <p className="text-xs text-blue-700">Status: {tripSummary.statusLabel || 'Aguardando confirmação'}</p>
        </div>

        <button
          onClick={onOpenTrip}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Atualizar status <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">OS &amp; RDO</h2>
          <Briefcase className="h-5 w-5 text-slate-600" />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <CompactBadge label="Aguardando aprovação" value={approvalSummary.pending} tone="warning" />
          <CompactBadge label="Rejeitados" value={approvalSummary.rejected} tone="danger" />
        </div>

        <button
          onClick={onOpenWork}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Abrir OS &amp; RDO <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
}
