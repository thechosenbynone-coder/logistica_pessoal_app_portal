import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const PORT = 3001; // Porta Fixa

// 1. Permite acesso de qualquer lugar (Resolve bloqueios de CORS)
app.use(cors());
app.use(express.json());

// 2. O TRADUTOR (DTO): Converte Banco -> Formato Frontend
const toFrontendDTO = (user) => {
  // Lógica de Status
  const embarque = user.deployments.find(d => d.status === 'ONBOARD');

  // Contagem de Documentos
  const docStats = { valid: 0, warning: 0, expired: 0 };
  user.documents.forEach(d => {
    if (d.status === 'VALID') docStats.valid++;
    if (d.status === 'WARNING') docStats.warning++;
    if (d.status === 'EXPIRED') docStats.expired++;
  });

  // Cálculo do GATE (Cor do Card)
  let gate = { level: 'APTO', reason: 'OK' };
  if (docStats.expired > 0) gate = { level: 'NAO_APTO', reason: 'Documentos Vencidos' };
  else if (docStats.warning > 0) gate = { level: 'APTO_RESTRICAO', reason: 'Atenção' };

  return {
    id: user.id,
    name: user.name, // O Frontend PRECISA desse campo 'name'
    registration: user.registration,
    role: user.jobTitle || 'Colaborador',
    // Campos visuais que o Frontend espera
    opStatus: embarque ? 'EMBARCADO' : 'EM_BASE',
    unit: embarque ? embarque.destination : '',
    base: embarque ? '' : 'Base Macaé',
    currentLocation: embarque ? { kind: 'unit', name: embarque.destination } : { kind: 'base', name: 'Base Macaé' },
    // Dados técnicos
    docs: docStats,
    gate: gate,
    deployments: user.deployments
  };
};

// Rota Principal (Colaboradores)
app.get('/api/employees', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { documents: true, deployments: true }
    });

    // Aplica a tradução em todos os usuários
    const formatted = users.map(toFrontendDTO);

    console.log(`✅ Enviando ${formatted.length} colaboradores para o Frontend.`);
    res.json(formatted);
  } catch (error) {
    console.error('❌ Erro no banco:', error);
    res.status(500).json([]);
  }
});

// Create Employee
app.post('/api/employees', async (req, res) => {
  try {
    const { name, role, cpf, base, unit } = req.body;

    // Simple Validation
    if (!name || !cpf) {
      return res.status(400).json({ error: 'Nome e CPF são obrigatórios.' });
    }

    // Gerar campos únicos obrigatórios do Schema
    const cleanCpf = cpf.replace(/\D/g, '');
    const registration = `MT-${cleanCpf.slice(-6)}`; // Fallback registration
    const email = `${cleanCpf}@fake-portal.com`; // Fallback unique email

    // Prepare nested write for Unit (Deployment) if 'unit' is provided
    let deploymentsCreate = [];
    if (unit) {
      deploymentsCreate.push({
        destination: unit,
        embarkDate: new Date(),
        status: 'ONBOARD'
      });
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        registration,
        email,
        jobTitle: role,
        deployments: {
          create: deploymentsCreate
        }
      },
      include: { documents: true, deployments: true }
    });

    console.log(`✨ Criado usuário: ${newUser.name} (${newUser.id})`);
    res.status(201).json(toFrontendDTO(newUser));

  } catch (error) {
    console.error('❌ Erro ao criar colaborador:', error);
    // Prisma Unique Constraint Error
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'CPF ou Matrícula já existe.' });
    }
    res.status(500).json({ error: 'Erro interno ao salvar.' });
  }
});

// Rota Dashboard
app.get('/api/dashboard', async (req, res) => {
  try {
    const stats = {
      totalEmployees: await prisma.user.count(),
      activeDeployments: await prisma.deployment.count({ where: { status: 'ONBOARD' } }),
      pendingDocs: await prisma.userDocument.count({ where: { status: { in: ['WARNING', 'EXPIRED'] } } }),
      pendingExpenses: 0
    };
    res.json({ stats });
  } catch (e) { res.status(500).json({ stats: {} }); }
});

app.listen(PORT, () => {
  console.log(`🔥 Backend rodando na porta ${PORT}`);
});
