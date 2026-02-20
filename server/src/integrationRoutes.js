import express from 'express';
import { PrismaClient } from '@prisma/client';
import {
  addNotification,
  composeJourney,
  newId,
  readStore,
  writeStore,
} from './integrationStore.js';

const router = express.Router();
const prisma = new PrismaClient(); // Conecta no Postgres (Neon)

// ==========================================
// ROTA RDO: COLABORADOR (APP) -> SERVIDOR
// ==========================================
router.post('/sync/rdo', async (req, res) => {
  try {
    const { employeeId, date, description, status } = req.body;
    
    // Grava o RDO direto na tabela real
    const newRdo = await prisma.serviceOrder.create({
      data: {
        employeeId: employeeId || 'cl_demo_user', 
        type: 'RDO',
        status: status || 'PENDING',
        details: description,
        date: new Date(date)
      }
    });

    res.json({ success: true, data: newRdo });
  } catch (error) {
    console.error("Erro ao salvar RDO no banco:", error);
    res.status(500).json({ error: 'Erro ao processar RDO no servidor' });
  }
});

// ==========================================
// ROTA RDO: SERVIDOR -> PORTAL RH
// ==========================================
router.get('/work-orders/rdo', async (req, res) => {
  try {
    const rdos = await prisma.serviceOrder.findMany({
      where: { type: 'RDO' },
      orderBy: { createdAt: 'desc' },
      include: { employee: true } // Traz os dados do funcionário, se existir
    });
    res.json(rdos);
  } catch (error) {
    console.error("Erro ao buscar RDOs:", error);
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
    pendingActions: store.requests.filter(r => r.employeeId === req.params.employeeId && r.status === 'pending')
  });
});

export default router;
