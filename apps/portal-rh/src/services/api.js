// apps/portal-rh/src/services/api.js

// 1. CONFIGURAÇÃO DA URL (DINÂMICA)
// Se tiver variável de ambiente (Vercel), usa ela. Se não, usa localhost.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

console.log(`🔌 API Configurada para: ${API_URL}`);

const api = {
  employees: {
    // LISTAR TODOS
    list: async () => {
      try {
        const response = await fetch(`${API_URL}/employees`);
        
        if (!response.ok) {
          throw new Error(`Erro API: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        // Garante que retorna um array, mesmo se o banco estiver vazio ou der glitch
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('❌ Erro ao buscar colaboradores:', error);
        // Retorna array vazio para não travar a tela com "map is not a function"
        return [];
      }
    },

    // CRIAR NOVO
    create: async (employeeData) => {
      try {
        const response = await fetch(`${API_URL}/employees`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(employeeData),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody.error || 'Falha ao cadastrar colaborador');
        }

        return await response.json();
      } catch (error) {
        console.error('❌ Erro ao criar colaborador:', error);
        throw error; // Relança o erro para a tela mostrar o alerta
      }
    },

    // ATUALIZAR (Para o botão de Lápis)
    update: async (id, employeeData) => {
      try {
        const response = await fetch(`${API_URL}/employees/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(employeeData),
        });

        if (!response.ok) throw new Error('Falha ao atualizar');
        return await response.json();
      } catch (error) {
        console.error('❌ Erro ao atualizar:', error);
        throw error;
      }
    },

    // EXCLUIR (Para o botão de Lixeira)
    delete: async (id) => {
      try {
        const response = await fetch(`${API_URL}/employees/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Falha ao excluir');
        return true;
      } catch (error) {
        console.error('❌ Erro ao excluir:', error);
        throw error;
      }
    }
  }
};

export default api;
