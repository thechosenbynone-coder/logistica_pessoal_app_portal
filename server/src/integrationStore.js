import fs from 'node:fs';
import path from 'node:path';

const DATA_PATH = path.resolve(process.cwd(), 'server/data/integration.json');

const nowIso = () => new Date().toISOString();

const seed = {
  employees: [
    { id: 1, name: 'João Silva', registration: '12345', photo: 'https://ui-avatars.com/api/?name=Joao+Silva&background=0D47A1&color=fff&size=128', unit: 'Operações', base: 'Cabo Frio', role: 'colaborador' },
  ],
  embarkations: [
    { id: 101, destination: 'Plataforma P-74', location: 'Bacia de Campos - RJ', embarkDate: '2026-01-18', disembarkDate: '2026-02-01', status: 'confirmed', vessel: 'P-74' },
    { id: 102, destination: 'FPSO P-70', location: 'Bacia de Santos - SP', embarkDate: '2026-02-20', disembarkDate: '2026-03-05', status: 'scheduled', vessel: 'P-70' },
  ],
  embarkationAssignments: [
    { employeeId: 1, embarkationId: 101 },
    { employeeId: 1, embarkationId: 102 },
  ],
  journeyTemplates: {
    '101': [
      { key: 'checkin_base', label: 'Check-in na base', detail: '18/01 • 05:30' },
      { key: 'embarque', label: 'Embarque', detail: '18/01 • 06:30' },
      { key: 'chegada', label: 'Chegada na unidade', detail: '18/01 • 07:45' },
    ],
  },
  journeyStatus: {
    '1:101': [
      { key: 'checkin_base', status: 'pending' },
      { key: 'embarque', status: 'pending' },
      { key: 'chegada', status: 'pending' },
    ],
  },
  trainings: [
    { id: 401, title: 'NR-33 Reciclagem', date: '2026-01-16', location: 'Centro de Treinamento RJ', status: 'scheduled', notes: 'Presencial', attachments: [] },
  ],
  trainingAssignments: [{ employeeId: 1, trainingId: 401 }],
  documents: [
    { id: 501, employeeId: 1, title: 'ASO 2026', category: 'certification', issuer: 'Medicina Ocupacional', issueDate: '2026-01-10', expiryDate: '2026-07-10', fileUrl: 'https://example.com/aso-2026.pdf' },
  ],
  requests: [],
  notifications: [],
};

function ensureStore() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(seed, null, 2));
  }
}

export function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

export function writeStore(next) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(next, null, 2));
  return next;
}

export function newId(list) {
  const max = list.reduce((acc, item) => Math.max(acc, Number(item?.id) || 0), 0);
  return max + 1;
}

export function addNotification(store, employeeId, type, title, message) {
  const id = newId(store.notifications);
  store.notifications.unshift({ id, employeeId: Number(employeeId), type, title, message, createdAt: nowIso(), readAt: null });
}

export function composeJourney(store, employeeId, embarkationId) {
  const templates = store.journeyTemplates[String(embarkationId)] || [];
  const statuses = store.journeyStatus[`${employeeId}:${embarkationId}`] || [];
  return templates.map((step) => ({
    key: step.key,
    label: step.label,
    detail: step.detail || '',
    status: statuses.find((s) => s.key === step.key)?.status || 'pending',
  }));
}
