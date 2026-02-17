import React from 'react';

export function AppShell({ children }) {
  return (
    <div className="min-h-[100dvh] bg-slate-200 px-3 py-4">
      <div className="relative mx-auto min-h-[calc(100dvh-2rem)] w-full max-w-[420px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {children}
      </div>
    </div>
  );
}
