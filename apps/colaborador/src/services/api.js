const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const CURRENT_USER_REGISTRATION = import.meta.env.VITE_REGISTRATION || '12345';

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

function withRegistration(path) {
  const url = new URL(`${API_URL}${path}`);
  url.searchParams.set('registration', CURRENT_USER_REGISTRATION);
  return url.toString();
}

const api = {
  profile: {
    get: async () => fetchJson(withRegistration('/profile'))
  },
  deployments: {
    list: async () => fetchJson(withRegistration('/deployments')),
    current: async () => fetchJson(withRegistration('/deployments/current'))
  },
  checkins: {
    create: async (payload) =>
      fetchJson(`${API_URL}/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, registration: CURRENT_USER_REGISTRATION })
      })
  },
  expenses: {
    list: async () => fetchJson(withRegistration('/expenses')),
    create: async (payload) =>
      fetchJson(`${API_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, registration: CURRENT_USER_REGISTRATION })
      })
  },
  advances: {
    list: async () => fetchJson(withRegistration('/advances')),
    create: async (payload) =>
      fetchJson(`${API_URL}/advances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, registration: CURRENT_USER_REGISTRATION })
      })
  }
};

export default api;
