import React from 'react';
import Button from '../../ui/Button';

export default function DeploymentCard({ deployment, onOpen, onAdvance }) {
  return <div className="border rounded p-2 bg-white"><div className="text-sm font-semibold">{deployment.employee?.name || `#${deployment.id}`}</div><div className="text-xs text-slate-500">{deployment.vessel?.name || 'Sem embarcação'}</div><div className="mt-2 flex gap-2"><Button variant="secondary" onClick={() => onOpen(deployment)}>Detalhes</Button><Button onClick={() => onAdvance(deployment)}>Avançar</Button></div></div>;
}
