import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '../ui/ui.js';
import {
  ClipboardList,
  FileText,
  HardHat,
  LayoutDashboard,
  Plane,
  Users,
  Wallet,
  ChevronsRight,
  ChevronsLeft
} from 'lucide-react';
import { ensureDemoSeed, getMode, setMode } from '../services/portalStorage';
import HoverBorderGradient from '../ui/HoverBorderGradient';
import { currentUser } from '../services/currentUser';

const NAV = [
  {
    title: 'Principal',
    items: [{ key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }]
  },
  {
    title: 'Operação',
    items: [
      { key: 'mobility', label: 'Escala e Embarque', icon: Plane },
      { key: 'equipment', label: 'EPIs', icon: HardHat },
      { key: 'work', label: 'OS / RDO', icon: ClipboardList }
    ]
  },
  {
    title: 'RH',
    items: [
      { key: 'employees', label: 'Colaboradores', icon: Users },
      { key: 'docs', label: 'Documentações', icon: FileText }
    ]
  },
  {
    title: 'Financeiro',
    items: [{ key: 'finance', label: 'Gestão Financeira', icon: Wallet }]
  }
];

export default function Sidebar({ active, onSelect, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [mode, setModeState] = useState(getMode());

  const activeKey = useMemo(() => {
    if (active === 'hotel') return 'mobility';
    if (active === 'employeeCreate') return 'employees';
    return active;
  }, [active]);

  useEffect(() => {
    const handleModeSync = () => setModeState(getMode());
    window.addEventListener('portal_rh_xlsx_updated', handleModeSync);
    return () => window.removeEventListener('portal_rh_xlsx_updated', handleModeSync);
  }, []);

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    if (nextMode === 'demo') ensureDemoSeed();
    setModeState(nextMode);
  };

  const handleSelect = (key) => {
    const fn = onNavigate || onSelect;
    if (typeof fn === 'function') fn(key);
  };

  const userInitial = (currentUser.name || 'J').trim().charAt(0).toUpperCase();

  return (
    <aside
      className={cn(
        'sticky top-0 h-screen shrink-0 border-r border-slate-200 bg-white',
        'flex flex-col overflow-hidden transition-[width] duration-200 ease-out',
        open ? 'w-64' : 'w-20'
      )}
      aria-label="Menu lateral"
    >
      <div className="px-3 pt-3 pb-2">
        <div className={cn('flex items-center', open ? 'justify-between' : 'justify-center')}>
          <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 grid place-items-center">
            <span className="text-sm font-bold text-white">RH</span>
          </div>
          {open && <div className="text-sm font-semibold text-slate-800">Portal RH</div>}
          <button
            type="button"
            className={cn(
              'h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
              open ? 'grid place-items-center' : 'hidden'
            )}
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <ChevronsLeft size={16} />
          </button>
        </div>
        {!open && (
          <button
            type="button"
            className="mt-2 h-8 w-full rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 grid place-items-center"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <ChevronsRight size={16} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 pb-2 overflow-hidden">
        {NAV.map((section) => (
          <div key={section.title} className="mb-2">
            {open && <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{section.title}</p>}
            <div className="space-y-1">
              {section.items.map((it) => {
                const Icon = it.icon;
                const isActive = activeKey === it.key;
                return (
                  <button
                    key={it.key}
                    type="button"
                    onClick={() => handleSelect(it.key)}
                    className={cn(
                      'w-full rounded-xl transition-colors',
                      'flex items-center',
                      open ? 'h-10 px-2 gap-2 justify-start' : 'h-10 px-0 justify-center',
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                    )}
                    aria-label={it.label}
                  >
                    <span
                      className={cn(
                        'h-10 w-10 rounded-xl grid place-items-center',
                        isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      <Icon size={18} />
                    </span>
                    {open && <span className="truncate text-sm font-medium">{it.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-3 pt-1 shrink-0">
        <div className={cn('rounded-2xl border border-slate-200 bg-white p-2', open ? '' : 'px-1')}>
          <div className={cn('flex items-center', open ? 'gap-2' : 'justify-center')}>
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt={currentUser.name} className="h-10 w-10 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 border border-blue-200 grid place-items-center text-sm font-bold">
                {userInitial}
              </div>
            )}
            {open && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">Jéssica</p>
                <p className="truncate text-xs text-slate-500">{currentUser.role}</p>
              </div>
            )}
          </div>

          {open ? (
            <div className="mt-2 rounded-xl bg-slate-100 p-1">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => handleModeChange('demo')}
                  className={cn(
                    'rounded-lg px-2 py-1.5 text-[11px] font-semibold',
                    mode === 'demo' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  )}
                >
                  DEMO
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('prod')}
                  className={cn(
                    'rounded-lg px-2 py-1.5 text-[11px] font-semibold',
                    mode === 'prod' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  )}
                >
                  PROD
                </button>
              </div>
            </div>
          ) : (
            <HoverBorderGradient
              as="button"
              type="button"
              duration={1.2}
              containerClassName="mt-2 w-full rounded-xl"
              className={cn('w-full rounded-xl px-1 py-1.5 text-[10px] font-semibold text-center', mode === 'demo' ? 'text-amber-700' : 'text-slate-600')}
              onClick={() => handleModeChange(mode === 'demo' ? 'prod' : 'demo')}
              aria-label={`Alternar modo atual: ${mode}`}
            >
              {mode === 'demo' ? 'DEMO' : 'PROD'}
            </HoverBorderGradient>
          )}
        </div>

        <p className="mt-2 text-center text-[10px] text-slate-400">{open ? 'Desenvolvido por Hubye' : 'Hubye'}</p>
      </div>
    </aside>
  );
}
