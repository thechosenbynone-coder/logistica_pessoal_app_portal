import React from 'react';

export function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-slate-100 py-0 sm:py-4">
      <div className="mx-auto min-h-screen w-full max-w-[420px] overflow-hidden border border-slate-200 bg-white shadow-xl sm:min-h-[calc(100vh-2rem)] sm:rounded-3xl">
        {children}
      </div>
    </div>
  );
}
