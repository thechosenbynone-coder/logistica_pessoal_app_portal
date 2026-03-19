import React, { useState, useEffect, useMemo } from 'react';
import { Route, Plane, Car, Hotel, Ship, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import apiService from '../../services/api';
import { panel, chip, monoLabel, thStyle, tdStyle, actionBtn, secTitle } from '../../ui/pageStyles.js';

const LEG_TYPES = ['AEREO', 'TRANSLADO_TERRESTRE', 'TRANSFER', 'HOSPEDAGEM', 'HELICOPTERO', 'BARCO'];

const LEG_EMOJIS = {
  'AEREO': '✈️',
  'TRANSLADO_TERRESTRE': '🚌',
  'TRANSFER': '🚗',
  'HOSPEDAGEM': '🏨',
  'HELICOPTERO': '🚁',
  'BARCO': '🚢'
};

const STATUS_COLORS = {
  'PENDENTE': 'var(--amber)',
  'CONFIRMADO': 'var(--blue)',
  'CONCLUIDO': 'var(--green)',
  'NO_SHOW': 'var(--red)',
  'CANCELADO': 'var(--muted)'
};

export default function TransladoPage() {
  const [deployments, setDeployments] = useState([]);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [legs, setLegs] = useState([]);
  const [expandedEmp, setExpandedEmp] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const [newLeg, setNewLeg] = useState({
    employee_id: '',
    type: 'AEREO',
    origin: '',
    destination: '',
    provider: '',
    locator: '',
    scheduledAt: '',
    cost: '',
    notes: ''
  });

  useEffect(() => {
    loadDeployments();
  }, []);

  const loadDeployments = async () => {
    // Busca embarques confirmados ou superior que precisam de translado
    const data = await apiService.deployments.list({ status: 'CONFIRMADO' });
    setDeployments(data);
  };

  const selectDeployment = async (dep) => {
    setSelectedDeployment(dep);
    setExpandedEmp(null);
    setIsAdding(false);
    await loadLegs(dep.id);
  };

  const loadLegs = async (depId) => {
    const data = await apiService.transferLegs.listByDeployment(depId);
    setLegs(data);
  };

  const handleStatusChange = async (legId, newStatus) => {
    await apiService.transferLegs.update(selectedDeployment.id, legId, { status: newStatus });
    await loadLegs(selectedDeployment.id);
  };

  const handleRemoveLeg = async (legId) => {
    if (!window.confirm('Deseja remover esta etapa?')) return;
    await apiService.transferLegs.remove(selectedDeployment.id, legId);
    await loadLegs(selectedDeployment.id);
  };

  const handleAddLeg = async () => {
    if (!newLeg.employee_id || !newLeg.type) {
       window.alert('Colaborador e tipo são obrigatórios.');
       return;
    }
    await apiService.transferLegs.create(selectedDeployment.id, newLeg);
    setIsAdding(false);
    setNewLeg({ ...newLeg, type: 'AEREO', origin: '', destination: '', provider: '', locator: '', scheduledAt: '', cost: '', notes: '' });
    await loadLegs(selectedDeployment.id);
  };

  // KPIs
  const kpis = useMemo(() => {
    if (!legs.length) return null;
    let total = legs.length, confirmadas = 0, concluidas = 0, pendentes = 0, noshow = 0, custo = 0;
    legs.forEach(l => {
      if (l.status === 'CONFIRMADO') confirmadas++;
      else if (l.status === 'CONCLUIDO') concluidas++;
      else if (l.status === 'PENDENTE') pendentes++;
      else if (l.status === 'NO_SHOW') noshow++;
      if (l.cost) custo += Number(l.cost);
    });
    return { total, confirmadas, concluidas, pendentes, noshow, custo };
  }, [legs]);

  // Agrupar por funcionário
  const groupedLegs = useMemo(() => {
    const groups = {};
    legs.forEach(leg => {
       if (!groups[leg.employeeId]) groups[leg.employeeId] = { employee: leg.employee, items: [] };
       groups[leg.employeeId].items.push(leg);
    });
    return Object.values(groups);
  }, [legs]);

  return (
    <div style={{ display: 'flex', gap: 20, height: '100%', alignItems: 'flex-start' }}>
      
      {/* Esquerda: Lista de Embarques */}
      <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={secTitle()}>Embarques Ativos</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {deployments.map(dep => (
            <div 
              key={dep.id} 
              onClick={() => selectDeployment(dep)}
              style={{
                ...panel(), 
                padding: '12px 16px', 
                cursor: 'pointer',
                border: selectedDeployment?.id === dep.id ? '2px solid var(--amber)' : '1px solid var(--border)',
                background: selectedDeployment?.id === dep.id ? 'var(--surface2)' : 'var(--surface)'
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                {dep.vessel?.name || `Embarque #${dep.id}`}
              </div>
              <div style={monoLabel({ marginTop: 4 })}>
                {new Date(dep.start_date || dep.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
          {deployments.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: 20 }}>
              Nenhum embarque ativo.
            </div>
          )}
        </div>
      </div>

      {/* Direita: Detalhe do Embarque */}
      {selectedDeployment && (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={secTitle()}>Detalhes do Translado</div>
                <div style={monoLabel({ marginTop: 4 })}>Embarque ID: {selectedDeployment.id} • Vaso: {selectedDeployment.vessel?.name}</div>
              </div>
            </div>

            {/* KPIs */}
            {kpis && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
                {[
                  { label: 'Total Logs', val: kpis.total, color: 'var(--text)' },
                  { label: 'Pendentes', val: kpis.pendentes, color: 'var(--amber)' },
                  { label: 'Confirmadas', val: kpis.confirmadas, color: 'var(--blue)' },
                  { label: 'Concluídas', val: kpis.concluidas, color: 'var(--green)' },
                  { label: 'No Shows', val: kpis.noshow, color: 'var(--red)' },
                  { label: 'Custo Total', val: `R$ ${kpis.custo.toFixed(2)}`, color: 'var(--text)' },
                ].map(k => (
                  <div key={k.label} style={{ ...panel(), padding: '12px 16px' }}>
                    <div style={monoLabel({ marginBottom: 4 })}>{k.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.val}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={panel({ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Roteiro por Colaborador</div>
                 <button style={actionBtn()} onClick={() => setIsAdding(!isAdding)}>
                   <Plus size={14} /> Adicionar etapa
                 </button>
              </div>

              {/* Form Inline Adicionar Etapa */}
              {isAdding && (
                <div style={{ background: 'var(--surface2)', padding: 16, borderRadius: 6, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={monoLabel()}>Colaborador</div>
                      <select style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} value={newLeg.employee_id} onChange={e => setNewLeg({...newLeg, employee_id: e.target.value})}>
                        <option value="">Selecione...</option>
                        {selectedDeployment.members?.map(m => (
                           <option key={m.employee_id} value={m.employee_id}>{m.employee?.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={monoLabel()}>Tipo</div>
                      <select style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} value={newLeg.type} onChange={e => setNewLeg({...newLeg, type: e.target.value})}>
                        {LEG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={monoLabel()}>Origem</div>
                      <input style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} value={newLeg.origin} onChange={e => setNewLeg({...newLeg, origin: e.target.value})} placeholder="Ex: GIG" />
                    </div>
                    <div>
                      <div style={monoLabel()}>Destino</div>
                      <input style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} value={newLeg.destination} onChange={e => setNewLeg({...newLeg, destination: e.target.value})} placeholder="Ex: Macaé" />
                    </div>
                    <div>
                      <div style={monoLabel()}>Fornecedor</div>
                      <input style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} value={newLeg.provider} onChange={e => setNewLeg({...newLeg, provider: e.target.value})} />
                    </div>
                    <div>
                      <div style={monoLabel()}>Localizador</div>
                      <input style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} value={newLeg.locator} onChange={e => setNewLeg({...newLeg, locator: e.target.value})} />
                    </div>
                    <div>
                      <div style={monoLabel()}>Data/Hora Prevista</div>
                      <input type="datetime-local" style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', colorScheme: 'dark' }} value={newLeg.scheduledAt} onChange={e => setNewLeg({...newLeg, scheduledAt: e.target.value})} />
                    </div>
                    <div>
                      <div style={monoLabel()}>Custo (R$)</div>
                      <input type="number" step="0.01" style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} value={newLeg.cost} onChange={e => setNewLeg({...newLeg, cost: e.target.value})} />
                    </div>
                    <div style={{ gridColumn: 'span 4' }}>
                      <div style={monoLabel()}>Observações</div>
                      <input style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} value={newLeg.notes} onChange={e => setNewLeg({...newLeg, notes: e.target.value})} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                    <button style={actionBtn(false)} onClick={() => setIsAdding(false)}>Cancelar</button>
                    <button style={actionBtn(true)} onClick={handleAddLeg}>Salvar Etapa</button>
                  </div>
                </div>
              )}

              {groupedLegs.length === 0 ? (
                 <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>Nenhum roteiro cadastrado.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {groupedLegs.map(group => {
                    const isExpanded = expandedEmp === group.employee.id;
                    return (
                      <div key={group.employee.id} style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                        
                        {/* Header Colaborador - Linha do tempo resumida */}
                        <div 
                          style={{ background: 'var(--surface)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                          onClick={() => setExpandedEmp(isExpanded ? null : group.employee.id)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                             <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{group.employee.name}</div>
                             <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                               {group.items.map(leg => (
                                 <span 
                                   key={leg.id}
                                   title={`${leg.type} - ${leg.status}`}
                                   style={{ 
                                     width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                     borderRadius: '50%', background: 'var(--bg)',
                                     border: `2px solid ${STATUS_COLORS[leg.status] || 'var(--border)'}`,
                                     fontSize: 12
                                   }}
                                 >
                                   {LEG_EMOJIS[leg.type] || '📍'}
                                 </span>
                               ))}
                             </div>
                          </div>
                          <div style={{ color: 'var(--muted)' }}>
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </div>
                        </div>

                        {/* Detalhe Expandido - Tabela */}
                        {isExpanded && (
                          <div style={{ background: 'var(--bg)', padding: 12, borderTop: '1px solid var(--border)', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                               <thead>
                                 <tr>
                                   <th style={thStyle}>#</th>
                                   <th style={thStyle}>Trecho</th>
                                   <th style={thStyle}>Dat/Hora</th>
                                   <th style={thStyle}>Infos</th>
                                   <th style={thStyle}>Custo</th>
                                   <th style={thStyle}>Status</th>
                                   <th style={thStyle}>Ações</th>
                                 </tr>
                               </thead>
                               <tbody>
                                 {group.items.map((leg, idx) => (
                                   <tr key={leg.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                      <td style={tdStyle()}>{idx + 1}</td>
                                      <td style={tdStyle()}>
                                        <div style={{ fontWeight: 500, color: 'var(--text)' }}>{leg.type}</div>
                                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                                          {leg.origin || '-'} → {leg.destination || '-'}
                                        </div>
                                      </td>
                                      <td style={tdStyle()}>{leg.scheduledAt ? new Date(leg.scheduledAt).toLocaleString() : '-'}</td>
                                      <td style={tdStyle()}>
                                        <div style={{ fontSize: 11, color: 'var(--text)' }}>{leg.provider || 'S/ Fornecedor'}</div>
                                        {leg.locator && <div style={{ fontSize: 11, color: 'var(--blue)' }}>Loc: {leg.locator}</div>}
                                      </td>
                                      <td style={tdStyle()}>{leg.cost ? `R$ ${Number(leg.cost).toFixed(2)}` : '-'}</td>
                                      <td style={tdStyle()}>
                                        <select 
                                          style={{ padding: '4px 6px', borderRadius: 4, background: 'var(--surface2)', color: 'var(--text)', border: `1px solid ${STATUS_COLORS[leg.status] || 'var(--border)'}`, fontSize: 11 }}
                                          value={leg.status}
                                          onChange={e => handleStatusChange(leg.id, e.target.value)}
                                        >
                                          <option value="PENDENTE">Pendente</option>
                                          <option value="CONFIRMADO">Confirmado</option>
                                          <option value="CONCLUIDO">Concluído</option>
                                          <option value="NO_SHOW">No Show</option>
                                          <option value="CANCELADO">Cancelado</option>
                                        </select>
                                      </td>
                                      <td style={tdStyle()}>
                                        <button style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 4 }} onClick={() => handleRemoveLeg(leg.id)}>
                                          <Trash2 size={14} />
                                        </button>
                                      </td>
                                   </tr>
                                 ))}
                               </tbody>
                            </table>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
      </div>
      )}
    </div>
  );
}
