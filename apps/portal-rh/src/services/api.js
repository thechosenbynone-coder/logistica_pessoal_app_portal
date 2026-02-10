// apps/portal-rh/src/services/api.js

const api = {
  employees: {
    list: async () => {
      const res = await fetch('/api/employees');
      return res.json();
    },
    create: async (data) => {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    }
  },
  dashboard: {
    getMetrics: async () => {
      const res = await fetch('/api/dashboard/metrics');
      return res.json();
    }
  }
};

// EXPORTAÇÃO PADRÃO (ESSENCIAL PARA O VITE/VERCEL)
export default api;
