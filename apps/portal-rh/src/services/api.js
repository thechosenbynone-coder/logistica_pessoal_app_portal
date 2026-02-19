import { apiFetch } from '../lib/apiClient';

const isProd =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    typeof import.meta.env.PROD === 'boolean' &&
    import.meta.env.PROD) ||
  (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production');

function normalizeListResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

const getDurationMs = (startTime) => {
  const start = Number.isFinite(startTime) ? startTime : Date.now();
  const duration = Date.now() - start;
  return Number.isFinite(duration) && duration >= 0 ? duration : 0;
};

async function request(method, path, payload) {
  const endpoint = path.startsWith('/') ? path : `/${path}`;
  const start = Date.now();
  try {
    const response = await apiFetch(endpoint, {
      method,
      ...(payload !== undefined ? { body: payload } : {}),
    });

    const durationMs = getDurationMs(start);
    if (!isProd) {
      console.log(`[API] ${method} ${endpoint} ${response.status} (${durationMs}ms)`);
    }

    if (response.status === 204) return null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return response.json();
    const text = await response.text();
    return text || null;
  } catch (error) {
    const durationMs = getDurationMs(start);
    const status = error?.status || 'ERR';
    console.error(`[API] ${method} ${endpoint} ${status} (${durationMs}ms)`);
    throw error;
  }
}

const api = {
  get: async (path) => ({ data: await request('GET', path) }),
  post: async (path, data) => ({ data: await request('POST', path, data) }),
  put: async (path, data) => ({ data: await request('PUT', path, data) }),
  delete: async (path) => ({ data: await request('DELETE', path) }),
  patch: async (path, data) => ({ data: await request('PATCH', path, data) }),
};

const apiService = {
  dashboard: {
    get: async () => (await api.get('/dashboard/metrics')).data,
  },
  employees: {
    list: async () => (await api.get('/employees')).data,
    create: async (data) => (await api.post('/employees', data)).data,
  },
  checkins: {
    list: async () => (await api.get('/checkins')).data,
    create: async (data) => (await api.post('/checkins', data)).data,
  },
  expenses: {
    list: async () => (await api.get('/financial-requests?type=Reembolso')).data,
    create: async (data) =>
      (await api.post('/financial-requests', { ...data, type: 'Reembolso' })).data,
  },
  advances: {
    list: async () => (await api.get('/financial-requests?type=Adiantamento')).data,
    create: async (data) =>
      (await api.post('/financial-requests', { ...data, type: 'Adiantamento' })).data,
  },
  profile: {
    get: async (reg) => (await api.get(`/profile?registration=${reg}`)).data,
  },
  vessels: {
    list: async () => normalizeListResponse((await api.get('/vessels')).data),
    create: async (data) => (await api.post('/vessels', data)).data,
  },
  mobility: {
    listVessels: async () => apiService.vessels.list(),
  },
  documentTypes: {
    list: async () => normalizeListResponse((await api.get('/document-types')).data),
    create: async (data) => (await api.post('/document-types', data)).data,
  },
  documents: {
    list: async () => normalizeListResponse((await api.get('/documents')).data),
    create: async (data) => (await api.post('/documents', data)).data,
    listByEmployee: async (employeeId) =>
      normalizeListResponse((await api.get(`/employees/${employeeId}/documents`)).data),
  },
  deployments: {
    list: async () => normalizeListResponse((await api.get('/deployments')).data),
    create: async (data) => (await api.post('/deployments', data)).data,
    listByEmployee: async (employeeId) =>
      normalizeListResponse((await api.get(`/employees/${employeeId}/deployments`)).data),
  },
  epiCatalog: {
    list: async () => normalizeListResponse((await api.get('/epi/catalog')).data),
    create: async (data) => (await api.post('/epi/catalog', data)).data,
  },
  epiDeliveries: {
    list: async () => normalizeListResponse((await api.get('/epi/deliveries')).data),
    create: async (data) => (await api.post('/epi/deliveries', data)).data,
    listByEmployee: async (employeeId) =>
      normalizeListResponse((await api.get(`/employees/${employeeId}/epi-deliveries`)).data),
  },
  dailyReports: {
    list: async () => (await api.get('/daily-reports')).data,
    create: async (data) => (await api.post('/daily-reports', data)).data,
  },
  serviceOrders: {
    list: async () => (await api.get('/service-orders')).data,
    create: async (data) => (await api.post('/service-orders', data)).data,
  },
  financialRequests: {
    list: async () => (await api.get('/financial-requests')).data,
    create: async (data) => (await api.post('/financial-requests', data)).data,
  },
  embarkations: {
    getCurrent: async (employeeId) =>
      (await api.get(`/employees/${employeeId}/embarkations/current`)).data,
    getNext: async (employeeId) => (await api.get(`/employees/${employeeId}/embarkations/next`)).data,
    createProgram: async (payload) => (await api.post('/admin/embarkations', payload)).data,
  },
  journey: {
    get: async (embarkationId, employeeId) =>
      normalizeListResponse(
        (await api.get(`/embarkations/${embarkationId}/journey?employeeId=${employeeId}`)).data
      ),
    update: async (embarkationId, payload) =>
      normalizeListResponse((await api.put(`/embarkations/${embarkationId}/journey`, payload)).data),
  },
  trainings: {
    listByEmployee: async (employeeId, status = 'scheduled') =>
      normalizeListResponse((await api.get(`/employees/${employeeId}/trainings?status=${status}`)).data),
    createProgram: async (payload) => (await api.post('/admin/trainings', payload)).data,
  },
  employeeRequests: {
    listByEmployee: async (employeeId, type = '') =>
      normalizeListResponse(
        (await api.get(`/employees/${employeeId}/requests${type ? `?type=${type}` : ''}`)).data
      ),
  },
  notifications: {
    listByEmployee: async (employeeId, since) =>
      normalizeListResponse(
        (
          await api.get(
            `/employees/${employeeId}/notifications${since ? `?since=${encodeURIComponent(since)}` : ''}`
          )
        ).data
      ),
  },
  adminRequests: {
    list: async (filters = {}) => {
      const params = new URLSearchParams();
      if (filters?.type) params.set('type', filters.type);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.employeeId) params.set('employeeId', String(filters.employeeId));
      const query = params.toString();
      return normalizeListResponse((await api.get(`/admin/requests${query ? `?${query}` : ''}`)).data);
    },
    update: async (id, payload) => (await api.put(`/admin/requests/${id}`, payload)).data,
  },
  adminDocuments: {
    create: async (payload) => (await api.post('/admin/documents', payload)).data,
  },
};

apiService.client = api;

export const apiClient = api;

export default apiService;
