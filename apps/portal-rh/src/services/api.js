import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const isProd =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    typeof import.meta.env.PROD === 'boolean' &&
    import.meta.env.PROD) ||
  (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production');

const api = axios.create({ baseURL });

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

api.interceptors.request.use(
  (config) => {
    const method = (config?.method || 'GET').toUpperCase();

    config.metadata = {
      ...(config.metadata || {}),
      startTime: Date.now(),
      method,
    };

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    const method =
      response.config?.metadata?.method || (response.config?.method || 'GET').toUpperCase();
    const url = response.config?.url || '';
    const status = response.status;
    const start = response.config?.metadata?.startTime ?? Date.now();
    const durationMs = getDurationMs(start);

    if (!isProd) {
      console.log(`[API] ${method} ${url} ${status} (${durationMs}ms)`);
    }

    return response;
  },
  (error) => {
    const method = error.config?.metadata?.method || (error.config?.method || 'GET').toUpperCase();
    const url = error.config?.url || '';
    const status = error.response?.status || 'ERR';
    const start = error.config?.metadata?.startTime ?? Date.now();
    const durationMs = getDurationMs(start);

    console.error(`[API] ${method} ${url} ${status} (${durationMs}ms)`);

    return Promise.reject(error);
  }
);

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
    list: async () => (await api.get('/document-types')).data,
    create: async (data) => (await api.post('/document-types', data)).data,
  },
  documents: {
    list: async () => (await api.get('/documents')).data,
    create: async (data) => (await api.post('/documents', data)).data,
    listByEmployee: async (employeeId) =>
      (await api.get(`/employees/${employeeId}/documents`)).data,
  },
  deployments: {
    list: async () => (await api.get('/deployments')).data,
    create: async (data) => (await api.post('/deployments', data)).data,
    listByEmployee: async (employeeId) =>
      (await api.get(`/employees/${employeeId}/deployments`)).data,
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
};

apiService.client = api;

export const apiClient = api;

export default apiService;
