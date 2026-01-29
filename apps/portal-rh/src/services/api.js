const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  employees: {
    list: async () => fetchJson(`${API_URL}/employees`)
  },
  dashboard: {
    get: async () => fetchJson(`${API_URL}/dashboard`)
  }
};
