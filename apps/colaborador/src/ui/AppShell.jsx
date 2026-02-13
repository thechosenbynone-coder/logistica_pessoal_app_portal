import React from 'react';

export function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-slate-200">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-white shadow-sm">
        {children}
      </div>
    </div>
  );
}
