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

function buildPaginatedQuery(params = {}) {
  const query = new URLSearchParams({ paginated: 'true' });

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    query.set(key, String(value));
  });

  return query.toString();
}

function hasValidPaginatedParams(params) {
  if (!params) return false;

  return Object.entries(params).some(([key, value]) => {
    if (value === undefined || value === null) return false;
    if (key === 'q') return String(value).trim().length > 0;
    return true;
  });
}

const getDurationMs = (startTime) => {
  const start = Number.isFinite(startTime) ? startTime : Date.now();
  const duration = Date.now() - start;
  return Number.isFinite(duration) && duration >= 0 ? duration : 0;
};

export async function fetchWithTimeout(path, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await apiFetch(path, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('Tempo limite excedido para a requisição.');
      timeoutError.code = 'REQUEST_TIMEOUT';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function request(method, path, payload) {
  const endpoint = path.startsWith('/') ? path : `/${path}`;
  const apiPath = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
  const start = Date.now();
  try {
    const response = await fetchWithTimeout(apiPath, {
      method,
      ...(payload !== undefined ? { body: payload } : {}),
    });

    const durationMs = getDurationMs(start);
    if (!isProd) {
      console.log(`[API] ${method} ${apiPath} ${response.status} (${durationMs}ms)`);
    }

    if (response.status === 204) return null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return response.json();
    const text = await response.text();
    return text || null;
  } catch (error) {
    const durationMs = getDurationMs(start);
    const status = error?.status || 'ERR';
    console.error(`[API] ${method} ${apiPath} ${status} (${durationMs}ms)`);
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
    pendencias: async () => (await api.get('/dashboard/pendencias')).data,
    escalas: async () => (await api.get('/dashboard/escalas')).data,
    vesselsSummary: async () => (await api.get('/dashboard/vessels-summary')).data,
    vesselsUpcoming: async () => (await api.get('/dashboard/vessels-upcoming')).data,
    activity: async () => (await api.get('/dashboard/activity')).data,
  },
  employees: {
    list: async (params) => {
      if (!params || Object.keys(params).length === 0 || !hasValidPaginatedParams(params)) {
        return (await api.get('/employees')).data;
      }

      const query = buildPaginatedQuery(params);
      return (await api.get(`/employees?${query}`)).data;
    },
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
  portalAuth: {
    login: async (data) => {
      const res = await apiFetch('/api/portal/auth/login', {
        method: 'POST',
        body: data,
        skipAuth: true,
      });
      return res.json();
    },
    refresh: async () => {
      const res = await apiFetch('/api/portal/auth/refresh', { method: 'POST', skipAuth: true });
      return res.json();
    },
    logout: async () => {
      const res = await apiFetch('/api/portal/auth/logout', { method: 'POST' });
      return res.json();
    },
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
    list: async (params) => {
      if (!params || Object.keys(params).length === 0 || !hasValidPaginatedParams(params))
        return normalizeListResponse((await api.get('/documents')).data);
      const query = buildPaginatedQuery(params);
      return (await api.get(`/documents?${query}`)).data;
    },
    create: async (data) => (await api.post('/documents', data)).data,
    listByEmployee: async (employeeId) =>
      normalizeListResponse((await api.get(`/employees/${employeeId}/documents`)).data),
  },
  documentations: {
    overview: async () => (await api.get('/documentations/overview')).data,
  },
  deployments: {
    list: async (params) => {
      if (!params || Object.keys(params).length === 0 || !hasValidPaginatedParams(params))
        return normalizeListResponse((await api.get('/deployments')).data);
      const query = buildPaginatedQuery(params);
      return (await api.get(`/deployments?${query}`)).data;
    },
    create: async (data) => (await api.post('/deployments', data)).data,
    updateStatus: async (id, status) =>
      (await api.patch(`/deployments/${id}/status`, { status })).data,
    listTickets: async (id) =>
      normalizeListResponse((await api.get(`/deployments/${id}/tickets`)).data),
    createTicket: async (id, data) => (await api.post(`/deployments/${id}/tickets`, data)).data,
    removeTicket: async (id, tid) => (await api.delete(`/deployments/${id}/tickets/${tid}`)).data,
    listMembers: async (id) => (await api.get(`/deployments/${id}/members`)).data || [],
    addMember: async (id, employeeId) =>
      (await api.post(`/deployments/${id}/members`, { employee_id: employeeId })).data,
    removeMember: async (id, employeeId) =>
      (await api.delete(`/deployments/${id}/members/${employeeId}`)).data,
    listByEmployee: async (employeeId) =>
      normalizeListResponse((await api.get(`/employees/${employeeId}/deployments`)).data),
  },
  tools: {
    list: async () => normalizeListResponse((await api.get('/tools')).data),
    create: async (data) => (await api.post('/tools', data)).data,
    listByDeployment: async (deploymentId) =>
      (await api.get(`/deployments/${deploymentId}/tools`)).data || [],
    assign: async (deploymentId, data) =>
      (await api.post(`/deployments/${deploymentId}/tools`, data)).data,
    updateStatus: async (deploymentId, assignmentId, data) =>
      (await api.patch(`/deployments/${deploymentId}/tools/${assignmentId}/status`, data)).data,
    remove: async (deploymentId, assignmentId) =>
      (await api.delete(`/deployments/${deploymentId}/tools/${assignmentId}`)).data,
  },
  epiCatalog: {
    list: async () => normalizeListResponse((await api.get('/epi/catalog')).data),
    create: async (data) => (await api.post('/epi/catalog', data)).data,
  },
  epiDeliveries: {
    list: async (params) => {
      if (!params || Object.keys(params).length === 0 || !hasValidPaginatedParams(params))
        return normalizeListResponse((await api.get('/epi/deliveries')).data);
      const query = buildPaginatedQuery(params);
      return (await api.get(`/epi/deliveries?${query}`)).data;
    },
    create: async (data) => (await api.post('/epi/deliveries', data)).data,
    updateStatus: async (id, data) => (await api.patch(`/epi/deliveries/${id}/status`, data)).data,
    registerReturn: async (id, data) =>
      (await api.patch(`/epi/deliveries/${id}/return`, data)).data,
    listPendencias: async () => normalizeListResponse((await api.get('/epi/pendencias')).data),
    listByEmployee: async (employeeId) =>
      normalizeListResponse((await api.get(`/employees/${employeeId}/epi-deliveries`)).data),
    fichaByEmployee: async (employeeId) =>
      (await api.get(`/employees/${employeeId}/epi-ficha`)).data,
  },
  epiFunctionRequirements: {
    list: async () => normalizeListResponse((await api.get('/epi/function-requirements')).data),
    create: async (data) => (await api.post('/epi/function-requirements', data)).data,
    remove: async (id) => (await api.delete(`/epi/function-requirements/${id}`)).data,
  },
  dailyReports: {
    list: async (params) => {
      if (!params || Object.keys(params).length === 0 || !hasValidPaginatedParams(params))
        return (await api.get('/daily-reports')).data;
      const query = buildPaginatedQuery(params);
      return (await api.get(`/daily-reports?${query}`)).data;
    },
    create: async (data) => (await api.post('/daily-reports', data)).data,
    review: async (id, data) => (await api.patch(`/daily-reports/${id}/review`, data)).data,
    semPreenchimento: async (date) =>
      (await api.get(`/rdo/sem-preenchimento${date ? `?date=${date}` : ''}`)).data,
    cobrar: async (employeeId) => (await api.post(`/daily-reports/${employeeId}/cobrar`, {})).data,
  },
  serviceOrders: {
    list: async (params) => {
      if (!params || Object.keys(params).length === 0 || !hasValidPaginatedParams(params))
        return (await api.get('/service-orders')).data;
      const query = buildPaginatedQuery(params);
      return (await api.get(`/service-orders?${query}`)).data;
    },
    create: async (data) => (await api.post('/service-orders', data)).data,
    review: async (id, data) => (await api.patch(`/service-orders/${id}/review`, data)).data,
  },
  financialRequests: {
    list: async (params) => {
      if (!params || Object.keys(params).length === 0 || !hasValidPaginatedParams(params))
        return normalizeListResponse((await api.get('/financial-requests')).data);
      const query = buildPaginatedQuery(params);
      return (await api.get(`/financial-requests?${query}`)).data;
    },
    listByType: async (type, status) => {
      const qs = new URLSearchParams();
      if (type) qs.set('type', type);
      if (status) qs.set('status', status);
      return normalizeListResponse((await api.get(`/financial-requests?${qs}`)).data);
    },
    create: async (data) => (await api.post('/financial-requests', data)).data,
    review: async (id, payload) =>
      (await api.patch(`/financial-requests/${id}/review`, payload)).data,
  },
  embarkations: {
    getCurrent: async (employeeId) =>
      (await api.get(`/employees/${employeeId}/embarkations/current`)).data,
    getNext: async (employeeId) =>
      (await api.get(`/employees/${employeeId}/embarkations/next`)).data,
    createProgram: async (payload) => (await api.post('/admin/embarkations', payload)).data,
  },
  journey: {
    get: async (embarkationId, employeeId) =>
      normalizeListResponse(
        (await api.get(`/embarkations/${embarkationId}/journey?employeeId=${employeeId}`)).data
      ),
    update: async (embarkationId, payload) =>
      normalizeListResponse(
        (await api.put(`/embarkations/${embarkationId}/journey`, payload)).data
      ),
  },
  trainings: {
    listByEmployee: async (employeeId, status = 'scheduled') =>
      normalizeListResponse(
        (await api.get(`/employees/${employeeId}/trainings?status=${status}`)).data
      ),
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
      return normalizeListResponse(
        (await api.get(`/admin/requests${query ? `?${query}` : ''}`)).data
      );
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
