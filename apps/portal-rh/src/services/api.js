// apps/portal-rh/src/services/api.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function monitoredFetch(url, options) {
  console.log('📡 Chamando API:', url);
  let res;

  try {
    res = await fetch(url, options);
    return res;
  } catch (err) {
    console.error('❌ FALHA NA API:', {
      status: res?.status,
      url: res?.url || url,
      error: err
    });
    throw err;
  }
}

const api = {
  employees: {
    list: async () => {
      const res = await monitoredFetch(`${API_URL}/employees`);
      if (!res.ok) throw new Error('Erro ao listar funcionários');
      return res.json();
    },
    create: async (data) => {
      const res = await monitoredFetch(`${API_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Erro ao criar funcionário');
      return res.json();
    }
  },
  dashboard: {
    getMetrics: async () => {
      const res = await monitoredFetch(`${API_URL}/dashboard/metrics`);
      return res.json();
    }
  }
};

export default api;
