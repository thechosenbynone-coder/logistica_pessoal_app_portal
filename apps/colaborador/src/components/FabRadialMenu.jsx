import React, { useEffect } from 'react';
import { BedDouble, Briefcase, FileText, Package, Plus, Wallet, X } from 'lucide-react';

const ACTIONS = [
  { key: 'create_rdo', label: 'Nova RDO', icon: FileText },
  { key: 'create_os', label: 'Nova OS', icon: Briefcase },
  { key: 'finance_request', label: 'Financeiro', icon: Wallet },
  { key: 'lodging_request', label: 'Hospedagem', icon: BedDouble },
  { key: 'epi_request', label: 'EPI', icon: Package },
];

const ARC_ANGLES = [-140, -115, -90, -65, -40];
const ARC_RADIUS = 110;

function getArcPosition(angle, radius) {
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;
  return { x, y };
}

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
        <button
          type="button"
          aria-label="Fechar menu de ações rápidas"
          className="absolute inset-0 bg-black/40 z-40"
          onClick={() => onOpenChange(false)}
        />
      ) : null}

      <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(16px+env(safe-area-inset-bottom))] z-50">
        {open ? (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-56 w-56 rounded-full bg-white/40 backdrop-blur-sm"
            aria-hidden="true"
          />
        ) : null}

        <div className="relative h-0 w-0">
          {ACTIONS.map(({ key, label, icon: Icon }, index) => {
            const angle = ARC_ANGLES[index] ?? -90;
            const { x, y } = getArcPosition(angle, ARC_RADIUS);
            const style = {
              transform: open
                ? `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1)`
                : 'translate(-50%, -50%) scale(0.6)',
              opacity: open ? 1 : 0,
              transition: `transform 240ms ease, opacity 200ms ease`,
              transitionDelay: open ? `${index * 30}ms` : '0ms',
            };

            return (
              <button
                key={key}
                type="button"
                aria-label={label}
                onClick={() => onAction(key)}
                style={style}
                className="absolute left-1/2 top-1/2 flex h-16 w-16 flex-col items-center justify-center rounded-full border border-blue-100 bg-white text-slate-700 shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Icon className="h-5 w-5 text-blue-700" />
                <span className="mt-0.5 text-[9px] font-semibold leading-tight">{label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-label={open ? 'Fechar menu rápido' : 'Abrir menu rápido'}
          onClick={() => onOpenChange(!open)}
          className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          {open ? <X className="h-6 w-6" /> : <Plus className="h-7 w-7" />}
        </button>
      </div>
    </>
  );
}
