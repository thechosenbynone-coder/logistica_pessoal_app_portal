import React, { useEffect, useRef } from 'react';
import { Briefcase, FileText, Plus, Shield, Wallet, X } from 'lucide-react';

const ACTIONS = [
  { key: 'create_rdo', label: 'Criar RDO', icon: FileText, pos: '-translate-x-24 -translate-y-16' },
  { key: 'create_os', label: 'Criar OS', icon: Briefcase, pos: '-translate-x-10 -translate-y-28' },
  { key: 'rh_request', label: 'Solicitação RH', icon: Wallet, pos: 'translate-x-8 -translate-y-24' },
  { key: 'epis', label: 'EPIs', icon: Shield, pos: 'translate-x-20 -translate-y-14' },
];

export function FabRadialMenu({ open, onOpenChange, onAction }) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onEsc = (event) => {
      if (event.key === 'Escape') onOpenChange(false);
    };

    const onClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', onEsc);
    window.addEventListener('mousedown', onClickOutside);

    return () => {
      window.removeEventListener('keydown', onEsc);
      window.removeEventListener('mousedown', onClickOutside);
    };
  }, [open, onOpenChange]);

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Fechar menu de ações rápidas"
          className="fixed inset-0 z-30 bg-black/30"
          onClick={() => onOpenChange(false)}
        />
      ) : null}

      <div className="pointer-events-none fixed bottom-5 left-1/2 z-40 -translate-x-1/2">
        <div ref={menuRef} className="relative pointer-events-auto flex items-center justify-center">
          {open
            ? ACTIONS.map(({ key, label, icon: Icon, pos }) => (
              <button
                key={key}
                type="button"
                aria-label={label}
                onClick={() => onAction(key)}
                className={`absolute ${pos} inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg ring-1 ring-slate-200 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))
            : null}

          <button
            type="button"
            aria-label={open ? 'Fechar menu rápido' : 'Abrir menu rápido'}
            onClick={() => onOpenChange(!open)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            {open ? <X className="h-6 w-6" /> : <Plus className="h-7 w-7" />}
          </button>
        </div>
      </div>
    </>
  );
}
