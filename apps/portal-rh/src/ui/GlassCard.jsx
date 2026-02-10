import React from 'react';
import { cn } from './ui';

export default function GlassCard({
  children,
  title,
  action,
  variant = 'default',
  onClick,
  className
}) {
  const clickable = typeof onClick === 'function';

  return (
    <section
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        'rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5 text-slate-200 backdrop-blur-xl transition duration-200',
        'shadow-[0_10px_30px_rgba(2,6,23,0.3)]',
        variant === 'alert' && 'border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.1)]',
        clickable && 'cursor-pointer hover:scale-[1.01] hover:border-slate-600/60',
        className
      )}
    >
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title ? (
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">{title}</h3>
          ) : (
            <span />
          )}
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}
