import React, { useEffect } from 'react';
import { BedDouble, Briefcase, FileText, Package, Plus, Wallet, X } from 'lucide-react';

const ACTIONS = [
  { key: 'create_rdo', label: 'Nova RDO', icon: FileText },
  { key: 'create_os', label: 'Nova OS', icon: Briefcase },
  { key: 'finance_request', label: 'Financeiro', icon: Wallet },
  { key: 'lodging_request', label: 'Hospedagem', icon: BedDouble },
  { key: 'epi_request', label: 'EPI', icon: Package },
];

const ARC_ANGLES = [-160, -125, -90, -55, -20];
const ARC_RADIUS = 92;

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
    <div className="pointer-events-none absolute inset-0 z-50">
      {open ? (
        <button
          type="button"
          aria-label="Fechar menu de ações rápidas"
          className="pointer-events-auto absolute inset-0 z-40 bg-black/30"
          onClick={() => onOpenChange(false)}
        />
      ) : null}

      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50">
        <div className="relative h-14 w-14">
          {open ? (
            <div
              className="absolute left-1/2 top-1/2 -z-10 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40 backdrop-blur-sm"
              aria-hidden="true"
            />
          ) : null}

          {ACTIONS.map(({ key, label, icon: Icon }, index) => {
            const angle = ARC_ANGLES[index] ?? -90;
            const { x, y } = getArcPosition(angle, ARC_RADIUS);
            const style = {
              transform: open
                ? `translate(-50%, -50%) translate(${x}px, ${y}px) scale(1)`
                : 'translate(-50%, -50%) scale(0)',
              opacity: open ? 1 : 0,
              transition: `transform 260ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 180ms ease`,
              transitionDelay: open ? `${index * 24}ms` : '0ms',
            };

            return (
              <button
                key={key}
                type="button"
                aria-label={label}
                onClick={() => {
                  onAction(key);
                  onOpenChange(false);
                }}
                style={style}
                className="pointer-events-auto absolute left-1/2 top-1/2 z-50 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-blue-100 bg-white text-slate-700 shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Icon className="h-4 w-4 text-blue-700" />
                <span className="mt-0.5 text-[8px] font-semibold leading-tight">{label}</span>
              </button>
            );
          })}

          <button
            type="button"
            aria-label={open ? 'Fechar menu rápido' : 'Abrir menu rápido'}
            onClick={() => onOpenChange(!open)}
            className="pointer-events-auto absolute left-1/2 top-1/2 z-50 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            {open ? <X className="h-6 w-6" /> : <Plus className="h-7 w-7" />}
          </button>
        </div>
      </div>
    </div>
  );
}
