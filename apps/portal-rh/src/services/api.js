// Este código pode variar dependendo das rotas do seu RH, 
// mas a exportação final DEVE ser assim:

const api = {
  employees: {
    list: async () => {
      const res = await fetch('/api/employees'); // ajuste para sua rota real
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

// ESSA LINHA É OBRIGATÓRIA
export default api;
