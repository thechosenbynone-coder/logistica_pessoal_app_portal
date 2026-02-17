import React from 'react';

function formatDate(value) {
  const timestamp = new Date(value || '').getTime();
  if (!Number.isFinite(timestamp) || timestamp <= 0) return '-';
  return new Date(timestamp).toLocaleString('pt-BR');
}

export function NotificationsView({ items = [], onMarkAllRead }) {
  const unreadIds = items.filter((item) => !item.readAt).map((item) => item.id);

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white p-4 shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Notificações</h2>
            <p className="text-xs text-slate-500">
              Acompanhe atualizações das suas solicitações e embarques.
            </p>
          </div>
          <button
            onClick={() => onMarkAllRead?.(unreadIds)}
            disabled={unreadIds.length === 0}
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Marcar todas como lidas
          </button>
        </div>
      </section>

      <section className="space-y-2">
        {items.length === 0 && (
          <div className="rounded-xl bg-white p-4 text-sm text-slate-500 shadow-md">
            Nenhuma notificação recebida.
          </div>
        )}

        {items.map((item) => (
          <article key={item.id} className="rounded-xl bg-white p-4 shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDate(item.createdAt)}</p>
              </div>
              {!item.readAt && (
                <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold uppercase text-red-700">
                  Não lida
                </span>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
