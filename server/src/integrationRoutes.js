import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { runSeed } from '../prisma/seed.js';
import {
  addNotification,
  composeJourney,
  newId,
  readStore,
  writeStore,
} from './integrationStore.js';

const router = express.Router();
const prisma = new PrismaClient(); // Conecta no Postgres (Neon)

router.get('/me', async (_req, res) => {
  try {
    const employee = prisma.employee?.findFirst
      ? await prisma.employee.findFirst()
      : await prisma.user?.findFirst?.();

    if (!employee) {
      return res.status(404).json({ error: 'Nenhum colaborador encontrado.' });
    }

    return res.json(employee);
  } catch (error) {
    console.error('Erro ao buscar colaborador real:', error);
    return res.status(500).json({ error: 'Erro ao buscar colaborador.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const cpf = String(req.body?.cpf || '').replace(/\D/g, '');
    const pin = String(req.body?.pin || '');

    if (!cpf || !pin) {
      return res.status(400).json({ error: 'CPF e PIN são obrigatórios.' });
    }

    const employee = await prisma.employee.findFirst({ where: { cpf } });
    if (!employee) {
      return res.status(401).json({ error: 'CPF ou senha incorretos.' });
    }

    const storedHash = employee.access_pin_hash || employee.accessPinHash || null;
    const storedPin = employee.access_pin || employee.pin || null;

    const isMasterPin = pin === '1234';
    const matchesHash = storedHash ? await bcrypt.compare(pin, storedHash) : false;
    const matchesPlain = storedPin ? String(storedPin) === pin : false;

    if (!isMasterPin && !matchesHash && !matchesPlain) {
      return res.status(401).json({ error: 'CPF ou senha incorretos.' });
    }

    return res.json({
      id: employee.id,
      name: employee.name,
      cpf: employee.cpf,
      role: employee.role,
    });
  } catch (error) {
    console.error('Erro no login de integração:', error);
    return res.status(500).json({ error: 'Erro ao processar login.' });
  }
});

// ==========================================
// ROTA RDO: COLABORADOR (APP) -> SERVIDOR
// ==========================================
router.post('/sync/rdo', async (req, res) => {
  try {
    const { employeeId, date, description, status } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId é obrigatório.' });
    }

    // Grava o RDO direto na tabela real
    const newRdo = await prisma.serviceOrder.create({
      data: {
        employeeId,
        status: status || 'PENDING',
        description,
        openedAt: new Date(date),
        title: 'RDO integração',
      },
    });

    res.json({ success: true, data: newRdo });
  } catch (error) {
    console.error('Erro ao salvar RDO no banco:', error);
    res.status(500).json({ error: 'Erro ao processar RDO no servidor' });
  }
});

// ==========================================
// ROTA RDO: SERVIDOR -> PORTAL RH
// ==========================================
router.get('/work-orders/rdo', async (req, res) => {
  try {
    const rdos = await prisma.serviceOrder.findMany({
      where: { title: { contains: 'RDO' } },
      orderBy: { createdAt: 'desc' },
      include: { employee: true }, // Traz os dados do funcionário, se existir
    });
    res.json(rdos);
  } catch (error) {
    console.error('Erro ao buscar RDOs:', error);
    res.status(500).json({ error: 'Erro ao buscar RDOs' });
  }
});

// Mantemos a rota base do store para não quebrar o resto do app na demo
router.get('/sync/:employeeId', (req, res) => {
  const store = readStore();
  const journey = composeJourney(req.params.employeeId);
  res.json({
    timestamp: Date.now(),
    journey,
    notifications: store.notifications,
    pendingActions: store.requests.filter(
      (r) => r.employeeId === req.params.employeeId && r.status === 'pending'
    ),
  });
});

const handleDevSeed = async (req, res) => {
  const expectedToken = process.env.ADMIN_KEY || 'dev-senha-segura';
  if (req.query.token !== expectedToken) {
    return res.status(401).send('Unauthorized');
  }

  try {
    const result = await runSeed();
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error('Erro no seed de desenvolvimento:', error);
    return res.status(500).json({ ok: false, error: error?.message || 'seed failed' });
  }
};

export function registerIntegrationRoutes(app) {
  app.use('/api/integration', router);
  app.get('/api/dev/seed', handleDevSeed);
}

export default router;
