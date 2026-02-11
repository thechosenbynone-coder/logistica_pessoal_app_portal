import axios from 'axios';

const baseURL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  'https://logistica-api-v1bk.onrender.com/api';

const isProd =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    typeof import.meta.env.PROD === 'boolean' &&
    import.meta.env.PROD) ||
  (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production');

const api = axios.create({ baseURL });

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
    const method = response.config?.metadata?.method || (response.config?.method || 'GET').toUpperCase();
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
    list: async () => (await api.get('/expenses')).data,
    create: async (data) => (await api.post('/expenses', data)).data,
  },
  advances: {
    list: async () => (await api.get('/advances')).data,
    create: async (data) => (await api.post('/advances', data)).data,
  },
  profile: {
    get: async (reg) => (await api.get(`/profile?registration=${reg}`)).data,
  },
};

export default apiService;
