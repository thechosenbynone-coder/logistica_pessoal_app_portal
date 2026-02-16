import React from 'react';

export function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-slate-200 px-3 py-4">
      <div className="mx-auto min-h-[calc(100vh-2rem)] w-full max-w-[420px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {children}
      </div>
    </div>
  );
}
