import React, { useEffect } from 'react';
import { BedDouble, Briefcase, FileText, Package, Plus, Wallet, X } from 'lucide-react';

const ACTIONS = [
  {
    key: 'create_rdo',
    label: 'Nova RDO',
    subtitle: 'Registrar relatório diário de obra',
    icon: FileText,
  },
  {
    key: 'create_os',
    label: 'Nova OS',
    subtitle: 'Abrir nova ordem de serviço',
    icon: Briefcase,
  },
  {
    key: 'finance_request',
    label: 'Solicitar Financeiro',
    subtitle: 'Reembolso, adiantamento e despesas',
    icon: Wallet,
  },
  {
    key: 'lodging_request',
    label: 'Solicitar Hospedagem',
    subtitle: 'Informar necessidade de hotel',
    icon: BedDouble,
  },
  {
    key: 'epi_request',
    label: 'Solicitar EPI',
    subtitle: 'Pedir entrega ou reposição de equipamento',
    icon: Package,
  },
];

export function FabRadialMenu({ open, onOpenChange, onAction }) {
  useEffect(() => {
    if (!open) return undefined;

    const onEsc = (event) => {
      if (event.key === 'Escape') onOpenChange(false);
    };

    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onOpenChange]);

  return (
    <>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Fechar ações rápidas"
            className="fixed inset-0 z-40 bg-black/45"
            onClick={() => onOpenChange(false)}
          />

          <section
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white p-4 shadow-2xl"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
            aria-label="Ações rápidas"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Ações rápidas</h2>
              <button
                type="button"
                aria-label="Fechar ações rápidas"
                onClick={() => onOpenChange(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              {ACTIONS.map(({ key, label, subtitle, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  aria-label={label}
                  onClick={() => onAction(key)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-slate-900">{label}</span>
                    <span className="block text-xs text-slate-500">{subtitle}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <div
        className="pointer-events-none fixed bottom-5 right-4 z-50"
        style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          aria-label={open ? 'Fechar menu rápido' : 'Abrir menu rápido'}
          onClick={() => onOpenChange(!open)}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          {open ? <X className="h-6 w-6" /> : <Plus className="h-7 w-7" />}
        </button>
      </div>
    </>
  );
}
