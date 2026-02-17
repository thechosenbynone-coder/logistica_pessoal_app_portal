const RAW_API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').trim();

const API_BASE_URL = (() => {
  if (RAW_API_BASE_URL) return RAW_API_BASE_URL.replace(/\/$/, '');
  if (import.meta.env.DEV) return 'http://localhost:3001/api';
  throw new Error(
    'VITE_API_BASE_URL (ou VITE_API_URL) não definido em produção para apps/colaborador. Configure VITE_API_BASE_URL no build/ambiente.'
  );
})();

const DEFAULT_TIMEOUT_MS = 15_000;

export const getToken = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem('el_token') || '';
};

export const setToken = (token) => {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem('el_token', token);
  }
};

export const clearAuth = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('el_token');
  window.localStorage.removeItem('employeeId');
};

async function request(path, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort('timeout'), timeoutMs);

  const token = getToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders, ...(headers || {}) },
      ...fetchOptions,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('timeout');
      timeoutError.status = 0;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const error = new Error(`API error ${response.status} on ${path}`);
    error.status = response.status;

    if ((response.status === 401 || response.status === 403) && path !== '/auth/login') {
      clearAuth();
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }

    throw error;
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();

  const text = await response.text();
  return text || null;
}

const normalizeListResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const api = {
  auth: {
    login: async (payload, options) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify(payload), ...options }),
  },
  employees: {
    get: async (id, options) => request(`/employees/${id}`, options),
  },
  embarkations: {
    getCurrent: async (employeeId, options) => request(`/employees/${employeeId}/embarkations/current`, options),
    getNext: async (employeeId, options) => request(`/employees/${employeeId}/embarkations/next`, options),
  },
  journey: {
    get: async (embarkationId, employeeId, options) =>
      normalizeListResponse(await request(`/embarkations/${embarkationId}/journey?employeeId=${employeeId}`, options)),
    update: async (embarkationId, employeeId, steps, options) =>
      normalizeListResponse(
        await request(`/embarkations/${embarkationId}/journey`, {
          method: 'PUT',
          body: JSON.stringify({ employeeId, steps }),
          ...options,
        })
      ),
  },
  trainings: {
    list: async (employeeId, status = 'scheduled', options) =>
      normalizeListResponse(await request(`/employees/${employeeId}/trainings?status=${encodeURIComponent(status)}`, options)),
  },
  documents: {
    list: async (employeeId, options) => {
      try {
        return normalizeListResponse(await request(`/employees/${employeeId}/documents`, options));
      } catch (error) {
        if (error?.status === 404) return [];
        throw error;
      }
    },
    listByEmployee: async (employeeId, options) => {
      try {
        return normalizeListResponse(await request(`/employees/${employeeId}/documents`, options));
      } catch (error) {
        if (error?.status === 404) return [];
        throw error;
      }
    },
  },
  deployments: {
    listByEmployee: async (employeeId, options) => {
      try {
        return normalizeListResponse(await request(`/employees/${employeeId}/deployments`, options));
      } catch (error) {
        if (error?.status === 404) return [];
        throw error;
      }
    },
  },
  epiDeliveries: {
    listByEmployee: async (employeeId, options) => {
      try {
        return normalizeListResponse(await request(`/employees/${employeeId}/epi-deliveries`, options));
      } catch (error) {
        if (error?.status === 404) return [];
        throw error;
      }
    },
  },
  dailyReports: {
    listByEmployee: async (employeeId, options) =>
      normalizeListResponse(await request(`/employees/${employeeId}/daily-reports`, options)),
    create: async (payload, options) =>
      request('/daily-reports', { method: 'POST', body: JSON.stringify(payload), ...options }),
  },
  serviceOrders: {
    listByEmployee: async (employeeId, options) =>
      normalizeListResponse(await request(`/employees/${employeeId}/service-orders`, options)),
    create: async (payload, options) =>
      request('/service-orders', { method: 'POST', body: JSON.stringify(payload), ...options }),
  },
  financialRequests: {
    listByEmployee: async (employeeId, options) =>
      normalizeListResponse(await request(`/employees/${employeeId}/financial-requests`, options)),
    create: async (payload, options) =>
      request('/financial-requests', { method: 'POST', body: JSON.stringify(payload), ...options }),
  },
  requests: {
    create: async (type, payload, options) =>
      request(`/requests/${type}`, { method: 'POST', body: JSON.stringify(payload), ...options }),
    listByEmployee: async (employeeId, type = '', options) =>
      normalizeListResponse(await request(`/employees/${employeeId}/requests${type ? `?type=${encodeURIComponent(type)}` : ''}`, options)),
  },
  notifications: {
    list: async (employeeId, since, options) =>
      normalizeListResponse(await request(`/employees/${employeeId}/notifications${since ? `?since=${encodeURIComponent(since)}` : ''}`, options)),
    markRead: async (employeeId, ids = [], options) =>
      request(`/employees/${employeeId}/notifications/read`, {
        method: 'POST',
        body: JSON.stringify({ ids }),
        ...options,
      }),
  },
  checkins: {
    create: async (payload, options) =>
      request('/checkins', { method: 'POST', body: JSON.stringify(payload), ...options }),
  },
};

export default api;
