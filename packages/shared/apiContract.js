/**
 * Shared API contract for Portal RH + Colaborador app.
 */
export const API_ROUTES = {
  employees: {
    get: (employeeId) => `/api/employees/${employeeId}`,
    requests: (employeeId, type = '') => `/api/employees/${employeeId}/requests${type ? `?type=${encodeURIComponent(type)}` : ''}`,
    documents: (employeeId) => `/api/employees/${employeeId}/documents`,
    trainings: (employeeId, status = 'scheduled') => `/api/employees/${employeeId}/trainings${status ? `?status=${encodeURIComponent(status)}` : ''}`,
    notifications: (employeeId, since = '') => `/api/employees/${employeeId}/notifications${since ? `?since=${encodeURIComponent(since)}` : ''}`,
    notificationsRead: (employeeId) => `/api/employees/${employeeId}/notifications/read`,
    embarkationCurrent: (employeeId) => `/api/employees/${employeeId}/embarkations/current`,
    embarkationNext: (employeeId) => `/api/employees/${employeeId}/embarkations/next`,
  },
  embarkations: {
    journey: (embarkationId) => `/api/embarkations/${embarkationId}/journey`,
  },
  requests: {
    os: '/api/requests/os',
    rdo: '/api/requests/rdo',
    finance: '/api/requests/finance',
    lodging: '/api/requests/lodging',
    epi: '/api/requests/epi',
  },
};

const PENDING = new Set(['pending', 'pendente', 'received', 'ready', 'in_progress', 'scheduled']);
const REJECTED = new Set(['rejected', 'rejeitado', 'reprovado', 'reject']);
const APPROVED = new Set(['approved', 'aprovado', 'synced', 'concluded', 'completed', 'done', 'paid']);

export function normalizeApprovalStatus(rawValue) {
  const value = String(rawValue || 'pending').toLowerCase();
  if (REJECTED.has(value)) return 'rejected';
  if (APPROVED.has(value)) return 'approved';
  if (PENDING.has(value)) return 'pending';
  return 'pending';
}

export function formatPtBrDate(input) {
  if (!input) return '';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR').format(date);
}
