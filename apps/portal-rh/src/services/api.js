// apps/portal-rh/src/services/api.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = {
  employees: {
    list: async () => {
      const res = await fetch(`${API_URL}/employees`);
      if (!res.ok) throw new Error('Erro ao listar funcionários');
      return res.json();
    },
    create: async (data) => {
      const res = await fetch(`${API_URL}/employees`, {
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
      const res = await fetch(`${API_URL}/dashboard/metrics`);
      return res.json();
    }
  }
};

export default api;
