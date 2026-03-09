import React, { useState } from 'react';
import { panel, tabStyle, secTitle, monoLabel } from '../../ui/pageStyles.js';
import Input from '../../ui/Input';
import EquipmentTab from './EquipmentTab';
import EpiStockTab from './EpiStockTab';
import EpiPendenciasTab from './EpiPendenciasTab';

const TABS = [
  { key: 'pendencias', label: 'Pendências' },
  { key: 'estoque',    label: 'Estoque' },
  { key: 'ficha',      label: 'Ficha por Colaborador' },
];

export default function EquipmentPage() {
  const [tab, setTab] = useState('pendencias');
  const [employeeId, setEmployeeId] = useState('');
  const employee = { id: Number(employeeId || 0), name: `Colaborador ${employeeId}` };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={secTitle()}>EPIs</div>
          <div style={monoLabel({ marginTop: 2 })}>Pendências, estoque e fichas de entrega</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4 }}>
        {TABS.map(t => (
          <span key={t.key} onClick={() => setTab(t.key)} style={tabStyle(tab === t.key)}>
            {t.label}
          </span>
        ))}
      </div>

      {/* Conteúdo */}
      {tab === 'pendencias' && <EpiPendenciasTab />}
      {tab === 'estoque'    && <EpiStockTab />}
      {tab === 'ficha'      && (
        <div style={panel({ padding: 16 })}>
          <div style={{ marginBottom: 12 }}>
            <Input
              placeholder="ID do colaborador"
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
            />
          </div>
          {employee.id > 0
            ? <EquipmentTab employee={employee} />
            : <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '24px 0', textAlign: 'center' }}>Informe o ID do colaborador</div>
          }
        </div>
      )}
    </div>
  );
}
