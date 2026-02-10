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
      className={cn(
        className,
        'rounded-2xl border bg-slate-800/40 backdrop-blur-md shadow-[0_10px_30px_rgba(2,6,23,0.35)] transition duration-200',
        'border-slate-700/50 text-slate-200',
        variant === 'alert' && 'border-rose-500/50 bg-rose-900/20',
        clickable && 'cursor-pointer hover:scale-[1.01] hover:border-slate-600/60'
      )}
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
    >
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3 border-b border-slate-700/50 px-5 pt-4 pb-3">
          {title ? <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-300">{title}</h3> : <span />}
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      )}
      <div className={cn('px-5 pb-5', !(title || action) && 'pt-5')}>{children}</div>
    </section>
  );
}
