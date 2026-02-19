const stripTrailingSlash = (value = '') => value.replace(/\/+$/, '');

export function getApiBase() {
  const useProxyInDev = import.meta.env.DEV && import.meta.env.VITE_API_USE_PROXY === 'true';
  if (useProxyInDev) return '';

  const rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (rawBase) return stripTrailingSlash(rawBase);

  if (import.meta.env.PROD) return 'https://logistica-api-v1bk.onrender.com';

  return '';
}

export function apiUrl(path = '') {
  const base = getApiBase();
  const safePath = typeof path === 'string' ? path : String(path || '');
  const endpoint = safePath.startsWith('/') ? safePath : `/${safePath}`;
  return base ? `${base}${endpoint}` : endpoint;
}

export async function apiFetch(path, options = {}) {
  const { headers, body, ...restOptions } = options;
  const hasJsonBody = body && typeof body === 'object' && !(body instanceof FormData);
  const url = apiUrl(path);

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
