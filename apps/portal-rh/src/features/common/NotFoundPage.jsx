import React from 'react';
import Card from '../../ui/Card.jsx';
import { ROUTE_PATHS } from '../../navigation/routes.js';

export default function NotFoundPage({ onNavigate }) {
  return (
    <Card className="p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Página não encontrada</h1>
      <p className="mt-2 text-sm text-slate-500">A rota solicitada não existe neste portal.</p>
      <button
        type="button"
        onClick={() => onNavigate(ROUTE_PATHS.dashboard)}
        className="mt-4 inline-flex text-sm font-semibold text-blue-700 hover:underline"
      >
        Voltar ao Dashboard
      </button>
    </Card>
  );
}
