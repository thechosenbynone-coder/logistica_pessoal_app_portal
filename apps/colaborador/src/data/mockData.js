import { uid, todayISO } from '../utils';

/**
 * Mock employee data.
 */
export const mockEmployee = {
    name: 'João Silva',
    registration: '12345',
    // CPF should never be logged - only store masked version in frontend
    currentStatus: 'Em Trânsito',
    photo: 'https://ui-avatars.com/api/?name=Joao+Silva&background=0D47A1&color=fff&size=128',
};

/**
 * Mock current trip data.
 */
export const mockCurrentTrip = {
    destination: 'Plataforma P-74',
    embarkDate: '2026-01-18',
    disembarkDate: '2026-02-01',
    daysRemaining: 3,
    location: 'Bacia de Campos - RJ',
    transportation: 'Helicóptero',
};

/**
 * Mock boarding data.
 */
export const mockBoarding = {
    date: '2026-01-18',
    time: '06:30',
    location: 'Base de Cabo Frio - RJ',
    flight: 'HEL-458',
    seat: '3A',
    terminal: 'Heliponto 2',
    checkInTime: '05:30',
};

/**
 * Mock timeline data.
 */
export const mockTimeline = [
    { date: '18/01', event: 'Check-in Base Cabo Frio', time: '05:30', status: 'pending' },
    { date: '18/01', event: 'Embarque Helicóptero', time: '06:30', status: 'pending' },
    { date: '18/01', event: 'Chegada Plataforma', time: '07:45', status: 'pending' },
    { date: '01/02', event: 'Desembarque Plataforma', time: '14:00', status: 'scheduled' },
];

/**
 * Mock documents.
 */
export const mockDocuments = [
    { name: 'Cartão de Embarque', type: 'PDF', date: '18/01/2026', iconType: 'plane' },
    { name: 'Ordem de Serviço', type: 'PDF', date: '15/01/2026', iconType: 'file' },
    { name: 'Comprovante de Diária', type: 'PDF', date: '15/01/2026', iconType: 'file' },
    { name: 'Seguro Viagem', type: 'PDF', date: '10/01/2026', iconType: 'file' },
];

/**
 * Mock personal documents.
 */
export const mockPersonalDocuments = [
    { name: 'RG', number: '12.345.678-9', issueDate: '15/03/2020', expiryDate: null, status: 'valid' },
    { name: 'CNH', number: '12345678900', issueDate: '20/06/2021', expiryDate: '20/06/2026', daysToExpiry: 155, status: 'valid' },
    { name: 'ASO', number: 'ASO-2024-001', issueDate: '10/01/2026', expiryDate: '10/07/2026', daysToExpiry: 175, status: 'valid' },
    { name: 'NR-35 (Trabalho em Altura)', number: 'NR35-2024-456', issueDate: '05/02/2024', expiryDate: '05/02/2026', daysToExpiry: 20, status: 'warning' },
    { name: 'NR-10 (Segurança Elétrica)', number: 'NR10-2023-789', issueDate: '15/12/2023', expiryDate: '15/12/2025', daysToExpiry: -32, status: 'expired' },
];

/**
 * Mock emergency contacts.
 */
export const mockEmergencyContacts = [
    { name: 'Emergência - Central 24h', phone: '0800-123-4567', type: 'emergency', description: 'Qualquer emergência médica ou de segurança' },
    { name: 'RH - Logística', phone: '(21) 3456-7890', type: 'rh', description: 'Dúvidas sobre embarque e viagens' },
    { name: 'SESMT', phone: '(21) 3456-7891', type: 'safety', description: 'Segurança e saúde ocupacional' },
    { name: 'Suporte TI', phone: '(21) 3456-7892', type: 'support', description: 'Problemas com sistemas e app' },
];

/**
 * Mock equipment data.
 */
export const mockEquipment = [
    { id: 1, name: 'Capacete de Segurança', code: 'EPI-001', status: 'embarcado', condition: 'bom', required: true },
    { id: 2, name: 'Óculos de Proteção', code: 'EPI-002', status: 'embarcado', condition: 'bom', required: true },
    { id: 3, name: 'Luvas de Segurança', code: 'EPI-003', status: 'embarcado', condition: 'bom', required: true },
    { id: 4, name: 'Botina com Biqueira', code: 'EPI-004', status: 'embarcado', condition: 'bom', required: true },
    { id: 5, name: 'Protetor Auricular', code: 'EPI-005', status: 'embarcado', condition: 'bom', required: true },
    { id: 6, name: 'Cinto de Segurança', code: 'EPI-006', status: 'embarcado', condition: 'bom', required: true },
    { id: 7, name: 'Talabarte', code: 'EPI-007', status: 'pendente', condition: 'novo', required: false },
    { id: 8, name: 'Notebook Dell', code: 'EQP-101', status: 'embarcado', condition: 'bom', required: false },
    { id: 9, name: 'Tablet Samsung', code: 'EQP-102', status: 'base', condition: 'bom', required: false },
];

/**
 * Mock embark history.
 */
export const mockEmbarkHistory = [
    { id: 1, destination: 'Plataforma P-74', location: 'Bacia de Campos - RJ', embarkDate: '2026-01-18', disembarkDate: '2026-02-01', status: 'agendado', days: 14, transportation: 'Helicóptero' },
    { id: 2, destination: 'Plataforma P-62', location: 'Bacia de Campos - RJ', embarkDate: '2025-12-20', disembarkDate: '2026-01-03', status: 'concluido', days: 14, transportation: 'Helicóptero' },
    { id: 3, destination: 'FPSO P-70', location: 'Bacia de Santos - SP', embarkDate: '2025-11-22', disembarkDate: '2025-12-06', status: 'concluido', days: 14, transportation: 'Barco' },
    { id: 4, destination: 'Plataforma P-58', location: 'Bacia de Campos - RJ', embarkDate: '2025-10-25', disembarkDate: '2025-11-08', status: 'concluido', days: 14, transportation: 'Helicóptero' },
    { id: 5, destination: 'Plataforma P-74', location: 'Bacia de Campos - RJ', embarkDate: '2025-09-27', disembarkDate: '2025-10-11', status: 'concluido', days: 14, transportation: 'Helicóptero' },
];

/**
 * Create initial work orders.
 */
export function createInitialWorkOrders() {
    const day = todayISO();
    const now = new Date().toISOString();
    return [
        {
            id: uid(),
            code: 'OS-2026-0102',
            title: 'Inspeção e reaperto de flange (Linha A-17)',
            origin: 'Drake',
            destination: 'Plataforma P-74',
            location: 'Bacia de Campos - RJ',
            assignedAt: now,
            dueDate: day,
            status: 'RECEIVED',
            safetyChecklist: [
                { id: uid(), label: 'DDS realizado (briefing de segurança)', done: false },
                { id: uid(), label: 'Permissão de Trabalho (PT) válida', done: false },
                { id: uid(), label: 'EPI completo e inspecionado', done: false },
                { id: uid(), label: 'Área sinalizada / isolada (se aplicável)', done: false },
            ],
            executionChecklist: [
                { id: uid(), label: 'Inspecionar flange visualmente', done: false },
                { id: uid(), label: 'Reapertar para torque especificado', done: false },
                { id: uid(), label: 'Registrar leitura/medição no app', done: false },
                { id: uid(), label: 'Limpeza e organização da área', done: false },
            ],
            time: { startedAt: null, endedAt: null, currentPauseStart: null, pauses: [] },
            evidences: [],
            incidents: [],
            signatures: { worker: null, workerSignedAt: null, supervisor: null, supervisorSignedAt: null },
            sync: { status: 'PENDING', lastAttemptAt: null, syncedAt: null },
        },
        {
            id: uid(),
            code: 'OS-2026-0103',
            title: 'Troca de sensor de vibração (Bomba 2)',
            origin: 'Drake',
            destination: 'Plataforma P-74',
            location: 'Bacia de Campos - RJ',
            assignedAt: now,
            dueDate: day,
            status: 'IN_PROGRESS',
            safetyChecklist: [
                { id: uid(), label: 'DDS realizado (briefing de segurança)', done: true },
                { id: uid(), label: 'Permissão de Trabalho (PT) válida', done: true },
                { id: uid(), label: 'Bloqueio/Tagout aplicado (se aplicável)', done: false },
                { id: uid(), label: 'EPI completo e inspecionado', done: true },
            ],
            executionChecklist: [
                { id: uid(), label: 'Remover sensor antigo', done: true },
                { id: uid(), label: 'Instalar sensor novo', done: false },
                { id: uid(), label: 'Testar leitura / calibração', done: false },
                { id: uid(), label: 'Registrar evidências no app', done: false },
            ],
            time: { startedAt: new Date().toISOString(), endedAt: null, currentPauseStart: null, pauses: [] },
            evidences: [],
            incidents: [],
            signatures: { worker: null, workerSignedAt: null, supervisor: null, supervisorSignedAt: null },
            sync: { status: 'PENDING', lastAttemptAt: null, syncedAt: null },
        },
    ];
}

/**
 * Initial expenses data.
 */
export const mockExpenses = [
    { id: 1, type: 'Alimentação', value: 85.5, date: '2026-01-15', receipt: true, status: 'approved', trip: 'P-74 Jan/2026' },
    { id: 2, type: 'Transporte', value: 45.0, date: '2026-01-15', receipt: true, status: 'pending', trip: 'P-74 Jan/2026' },
    { id: 3, type: 'Hospedagem', value: 220.0, date: '2026-01-14', receipt: true, status: 'approved', trip: 'P-74 Jan/2026' },
];

/**
 * Initial advances data.
 */
export const mockAdvances = [
    { id: 1, value: 500.0, date: '2026-01-10', status: 'approved', trip: 'P-74 Jan/2026', used: 350.5 },
    { id: 2, value: 300.0, date: '2025-12-20', status: 'paid', trip: 'P-62 Dez/2025', used: 300.0 },
];

/**
 * Initial reimbursements data.
 */
export const mockReimbursements = [
    { id: 1, value: 130.0, date: '2026-01-16', status: 'paid', description: 'Reembolso Transporte (ajuste)', trip: 'P-74 Jan/2026' },
    { id: 2, value: 85.5, date: '2026-01-17', status: 'scheduled', description: 'Reembolso Alimentação', trip: 'P-74 Jan/2026' },
];
