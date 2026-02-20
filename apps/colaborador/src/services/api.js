import { apiFetch } from '../lib/apiClient';

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

  const endpoint = path.startsWith('/') ? path : `/${path}`;
  const apiPath = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;

  let response;
  try {
    response = await apiFetch(apiPath, {
      headers: { ...authHeaders, ...(headers || {}) },
      ...fetchOptions,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('timeout');
      timeoutError.status = 0;
      throw timeoutError;
    }

    if ((error?.status === 401 || error?.status === 403) && endpoint !== '/auth/login') {
      clearAuth();
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
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
      request('/auth/login', { method: 'POST', body: payload, ...options }),
  },
  employees: {
    get: async (id, options) => request(`/employees/${id}`, options),
  },
  embarkations: {
    getCurrent: async (employeeId, options) =>
      request(`/employees/${employeeId}/embarkations/current`, options),
    getNext: async (employeeId, options) =>
      request(`/employees/${employeeId}/embarkations/next`, options),
  },
  journey: {
    get: async (embarkationId, employeeId, options) =>
      normalizeListResponse(
        await request(`/embarkations/${embarkationId}/journey?employeeId=${employeeId}`, options)
      ),
    update: async (embarkationId, employeeId, steps, options) =>
      normalizeListResponse(
        await request(`/embarkations/${embarkationId}/journey`, {
          method: 'PUT',
          body: { employeeId, steps },
          ...options,
        })
      ),
  },
  trainings: {
    list: async (employeeId, status = 'scheduled', options) =>
      normalizeListResponse(
        await request(
          `/employees/${employeeId}/trainings?status=${encodeURIComponent(status)}`,
          options
        )
      ),
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
        return normalizeListResponse(
          await request(`/employees/${employeeId}/deployments`, options)
        );
      } catch (error) {
        if (error?.status === 404) return [];
        throw error;
      }
    },
  },
  epiDeliveries: {
    listByEmployee: async (employeeId, options) => {
      try {
        return normalizeListResponse(
          await request(`/employees/${employeeId}/epi-deliveries`, options)
        );
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
      request('/daily-reports', { method: 'POST', body: payload, ...options }),
  },
  serviceOrders: {
    listByEmployee: async (employeeId, options) =>
      normalizeListResponse(await request(`/employees/${employeeId}/service-orders`, options)),
    create: async (payload, options) =>
      request('/service-orders', { method: 'POST', body: payload, ...options }),
  },
  financialRequests: {
    listByEmployee: async (employeeId, options) =>
      normalizeListResponse(await request(`/employees/${employeeId}/financial-requests`, options)),
    create: async (payload, options) =>
      request('/financial-requests', { method: 'POST', body: payload, ...options }),
  },
  requests: {
    create: async (type, payload, options) =>
      request(`/requests/${type}`, { method: 'POST', body: payload, ...options }),
    listByEmployee: async (employeeId, type = '', options) =>
      normalizeListResponse(
        await request(
          `/employees/${employeeId}/requests${type ? `?type=${encodeURIComponent(type)}` : ''}`,
          options
        )
      ),
  },
  notifications: {
    list: async (employeeId, since, options) =>
      normalizeListResponse(
        await request(
          `/employees/${employeeId}/notifications${since ? `?since=${encodeURIComponent(since)}` : ''}`,
          options
        )
      ),
    markRead: async (employeeId, ids = [], options) =>
      request(`/employees/${employeeId}/notifications/read`, {
        method: 'POST',
        body: { ids },
        ...options,
      }),
  },
  checkins: {
    create: async (payload, options) =>
      request('/checkins', { method: 'POST', body: payload, ...options }),
  },
  integration: {
    login: async (payload, options) =>
      request('/integration/login', { method: 'POST', body: payload, ...options }),
    me: async (options) => request('/integration/me', options),
    syncRdo: async (payload, options) =>
      request('/integration/sync/rdo', { method: 'POST', body: payload, ...options }),
  },
};

export default api;
