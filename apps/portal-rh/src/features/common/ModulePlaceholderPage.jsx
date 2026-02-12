import React from 'react';
import Card from '../../ui/Card.jsx';
import Badge from '../../ui/Badge.jsx';

export default function ModulePlaceholderPage({ title }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <Badge tone="blue">Em desenvolvimento</Badge>
      </div>
      <p className="mt-4 text-base font-semibold text-slate-700">Em desenvolvimento</p>
      <p className="mt-1 text-sm text-slate-500">Este módulo ainda não possui dados/integração.</p>
    </Card>
  );
}
