import React from 'react';
import { Bell, UserRound } from 'lucide-react';
import { currentUser } from '../services/currentUser';

export default function Topbar() {
  return (
    <header className="flex items-center justify-end gap-2">
      <button className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50" type="button" aria-label="Notificações">
        <Bell size={16} />
      </button>
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
        {currentUser.avatar ? (
          <img src={currentUser.avatar} alt={currentUser.name} className="h-7 w-7 rounded-full object-cover border border-slate-200" />
        ) : (
          <div className="h-7 w-7 rounded-full bg-slate-100 grid place-items-center">
            <UserRound size={14} className="text-slate-500" />
          </div>
        )}
        <div className="leading-tight">
          <div className="text-xs font-semibold text-slate-800">Jéssica</div>
          <div className="text-[11px] text-slate-500">{currentUser.role}</div>
        </div>
      </div>
    </header>
  );
}
