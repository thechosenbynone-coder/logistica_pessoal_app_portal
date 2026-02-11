import axios from 'axios';

const apiInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://sua-api-no-render.onrender.com',
});

// Interceptor para Log (Patch 3: Observabilidade)
apiInstance.interceptors.request.use(request => {
  console.log('🚀 API Request:', request.method.toUpperCase(), request.url);
  return request;
});

const api = {
  dashboard: {
    // Renomeado de getMetrics para get para sanar o TypeError
    get: async () => {
      try {
        const response = await apiInstance.get('/dashboard/metrics');
        return response.data;
      } catch (error) {
        console.error('❌ Erro ao buscar métricas:', error);
        throw error;
      }
    }
  },
  employees: {
    list: () => apiInstance.get('/employees'),
    create: (data) => apiInstance.post('/employees', data),
  }
};

export default api; // Garante que o 'rr' no erro do Vercel encontre o objeto
