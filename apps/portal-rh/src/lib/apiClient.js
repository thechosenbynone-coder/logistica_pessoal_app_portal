const stripTrailingSlash = (value = '') => value.replace(/\/+$/, '');

export function getApiBase() {
  const useProxyInDev = import.meta.env.DEV && import.meta.env.VITE_API_USE_PROXY === 'true';
  if (useProxyInDev) return '';

  const rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim();
  return rawBase ? stripTrailingSlash(rawBase) : '';
}

export function apiUrl(path = '') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBase();
  return base ? `${base}${normalizedPath}` : normalizedPath;
}

export async function apiFetch(path, options = {}) {
  const { headers, body, ...restOptions } = options;
  const hasJsonBody = body && typeof body === 'object' && !(body instanceof FormData);

  const response = await fetch(apiUrl(path), {
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
