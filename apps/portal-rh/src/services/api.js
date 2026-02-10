// SEM MOCK. SEM IMPORTAR DADOS FALSOS.
// SE DER ERRO, VAI QUEBRAR E VAMOS DESCOBRIR O PORQUÊ.

const API_URL = 'http://localhost:3001/api';

async function fetchEmployees() {
  console.log(`🧨 TENTATIVA CRUA DE CONEXÃO EM: ${API_URL}/employees`);

  const response = await fetch(`${API_URL}/employees`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // 'Access-Control-Allow-Origin': '*' // O navegador ignora isso aqui, mas ajuda mentalmente
    }
  });

  console.log(`A resposta do servidor foi: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    // Se o servidor respondeu com erro (404, 500), vamos ler o texto do erro
    const erroTexto = await response.text();
    throw new Error(`ERRO DO SERVIDOR: ${response.status} - ${erroTexto}`);
  }

  const data = await response.json();
  console.log("✅ DADOS REAIS RECEBIDOS DO BANCO:", data);

  return data;
}

async function fetchDashboard() {
  const response = await fetch(`${API_URL}/dashboard`);
  if (!response.ok) throw new Error('Erro ao buscar dashboard');
  return await response.json();
}

// Função para criar colaborador (POST)
async function createEmployee(payload) {
  const response = await fetch(`${API_URL}/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao criar colaborador');
  }

  return await response.json();
}

export const api = {
  employees: {
    list: fetchEmployees,
    create: createEmployee
  },
  dashboard: { get: fetchDashboard }
};
