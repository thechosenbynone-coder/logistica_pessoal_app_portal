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

let _accessToken = localStorage.getItem('portal_access_token') || null;
let _refreshing = null;

export function setAccessToken(token) {
  _accessToken = token;
  if (token) localStorage.setItem('portal_access_token', token);
  else localStorage.removeItem('portal_access_token');
}

export function getAccessToken() {
  return _accessToken;
}

export function clearSession() {
  setAccessToken(null);
}

async function tryRefresh() {
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    try {
      const res = await fetch(apiUrl('/api/portal/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('refresh_failed');
      const data = await res.json();
      setAccessToken(data.access_token);
      return true;
    } catch {
      clearSession();
      return false;
    } finally {
      _refreshing = null;
    }
  })();
  return _refreshing;
}

export async function apiFetch(path, options = {}) {
  const { headers, body, skipAuth, ...restOptions } = options;
  const hasJsonBody = body && typeof body === 'object' && !(body instanceof FormData);
  const url = apiUrl(path);

  const makeRequest = (token) =>
    fetch(url, {
      ...restOptions,
      credentials: 'include',
      headers: {
        ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
      body: hasJsonBody ? JSON.stringify(body) : body,
    });

  let response = await makeRequest(!skipAuth ? _accessToken : null);

  if (response.status === 401 && !skipAuth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      response = await makeRequest(_accessToken);
    } else {
      window.dispatchEvent(new CustomEvent('portal:session-expired'));
      const error = new Error('Sessão expirada.');
      error.status = 401;
      throw error;
    }
  }

  if (!response.ok) {
    const error = new Error(`Erro ao acessar API (${response.status}).`);
    error.status = response.status;
    throw error;
  }

  return response;
}
