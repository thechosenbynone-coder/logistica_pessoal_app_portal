export const ROUTE_PATHS = {
  dashboard: '/dashboard',
  employees: '/colaboradores',
  docs: '/documentacoes',
  mobility: '/mobility',
  rdo: '/rdo',
  os: '/os',
  finance: '/financeiro',
  equipment: '/epi',
  hotel: '/hotelaria'
};

const KEY_TO_PATH = {
  ...ROUTE_PATHS,
  work: ROUTE_PATHS.rdo,
  employeeCreate: '/colaboradores/novo'
};

function buildSearch(params) {
  if (!params || typeof params !== 'object') return '';
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && `${value}` !== '');
  if (!entries.length) return '';
  const search = new URLSearchParams(entries.map(([key, value]) => [key, String(value)])).toString();
  return search ? `?${search}` : '';
}

export function resolvePathByKey(key, params) {
  const basePath = KEY_TO_PATH[key] || ROUTE_PATHS.dashboard;
  return `${basePath}${buildSearch(params)}`;
}
