const stripTrailingSlash = (value = '') => value.replace(/\/+$/, '');
const stripLeadingSlash = (value = '') => value.replace(/^\/+/, '');
const stripLeadingApiSegment = (value = '') => value.replace(/^\/api(?=\/|$)/, '');
const hasApiPrefix = (value = '') => /^\/api(?=\/|$)/.test(value);

let didLogDevSamples = false;

export function getApiBase() {
  const useProxyInDev = import.meta.env.DEV && import.meta.env.VITE_API_USE_PROXY === 'true';
  if (useProxyInDev) return '';

  const rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim();
  return rawBase ? stripTrailingSlash(rawBase) : '';
}

export function joinUrl(base = '', path = '') {
  if (!base) return path || '';
  if (!path) return base;
  return `${stripTrailingSlash(base)}/${stripLeadingSlash(path)}`;
}

export function normalizeApiPath(base = '', path = '') {
  const safePath = typeof path === 'string' ? path : String(path || '');
  const withLeadingSlash = safePath.startsWith('/') ? safePath : `/${safePath}`;
  const prefixedPath = hasApiPrefix(withLeadingSlash) ? withLeadingSlash : `/api${withLeadingSlash}`;
  const baseEndsWithApi = stripTrailingSlash(base).endsWith('/api');

  if (baseEndsWithApi && hasApiPrefix(prefixedPath)) {
    const withoutApiPrefix = stripLeadingApiSegment(prefixedPath) || '/';
    return withoutApiPrefix;
  }

  return prefixedPath;
}

export function apiUrl(path = '') {
  const base = getApiBase();
  const normalizedPath = normalizeApiPath(base, path);
  return base ? joinUrl(base, normalizedPath) : normalizedPath;
}

export async function apiFetch(path, options = {}) {
  const { headers, body, ...restOptions } = options;
  const hasJsonBody = body && typeof body === 'object' && !(body instanceof FormData);
  const url = apiUrl(path);

  if (import.meta.env.DEV && !didLogDevSamples) {
    didLogDevSamples = true;
    console.log('[apiClient] URL samples:', {
      dashboard: apiUrl('/dashboard/metrics'),
      employees: apiUrl('/employees'),
    });
  }

  const response = await fetch(url, {
    ...restOptions,
    headers: {
      ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...(headers || {}),
    },
    body: hasJsonBody ? JSON.stringify(body) : body,
  });

  if (!response.ok) {
    const error = new Error(`Erro ao acessar API (${response.status}).`);
    error.status = response.status;
    throw error;
  }

  return response;
}
