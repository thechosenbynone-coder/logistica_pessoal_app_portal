export const mockEmployees = [
  {
    id: 'u_001',
    name: 'Jéssica Martins Tavares da Silva',
    registration: 'MT-10293',
    cpf: '175.162.237-19',
    phone: '21 97972-6035',
    role: 'Motorista',
    hub: 'São Gonçalo',
    client: 'SHOPEE',
    status: 'ATIVO',
    nextDeployment: { destination: 'P-74', embarkDate: '2026-02-02', transport: 'HELICÓPTERO' },
    docs: { valid: 6, warning: 1, expired: 0 },
    equipment: { assigned: 5, pendingReturn: 1 }
  },
  {
    id: 'u_002',
    name: 'Carlos Fernando de Miranda',
    registration: 'MT-09422',
    cpf: '127.122.577-82',
    phone: '21 9XXXX-XXXX',
    role: 'Ajudante',
    hub: 'Duque de Caxias',
    client: 'Mercado Livre',
    status: 'ATIVO',
    nextDeployment: { destination: 'Base Cabiúnas', embarkDate: '2026-02-05', transport: 'ÔNIBUS' },
    docs: { valid: 4, warning: 0, expired: 2 },
    equipment: { assigned: 3, pendingReturn: 0 }
  },
  {
    id: 'u_003',
    name: 'Marcos da Silva Gonçalves',
    registration: 'MT-08810',
    cpf: '0XX.XXX.XXX-XX',
    phone: '21 9XXXX-XXXX',
    role: 'Operador',
    hub: 'Niterói',
    client: 'Site Próprio',
    status: 'INATIVO',
    nextDeployment: null,
    docs: { valid: 2, warning: 0, expired: 3 },
    equipment: { assigned: 0, pendingReturn: 0 }
  }
]

export const mockEquipmentCatalog = [
  { id: 'eq_001', type: 'EPI', name: 'Capacete', requiresSize: false, requiresCode: true },
  { id: 'eq_002', type: 'EPI', name: 'Bota', requiresSize: true, requiresCode: false },
  { id: 'eq_003', type: 'EPI', name: 'Óculos de proteção', requiresSize: false, requiresCode: false },
  { id: 'eq_004', type: 'Equipamento', name: 'Celular corporativo', requiresSize: false, requiresCode: true },
  { id: 'eq_005', type: 'Equipamento', name: 'Crachá', requiresSize: false, requiresCode: true }
]
