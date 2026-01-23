import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { toJson } from './serializers.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN,
    credentials: false
  })
);
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'employee-logistics-api', time: new Date().toISOString() });
});

// Helper: resolve user by registration (matrícula) or id
async function resolveUser({ userId, registration }) {
  if (userId) {
    return prisma.user.findUnique({ where: { id: userId } });
  }
  if (registration) {
    return prisma.user.findUnique({ where: { registration } });
  }
  return null;
}

// --- Profile (user + current trip + docs + assets) ---
app.get('/api/profile', async (req, res) => {
  try {
    const { userId, registration } = req.query;
    const user = await resolveUser({ userId, registration });
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    const [documents, assets] = await Promise.all([
      prisma.userDocument.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
      prisma.assetAssignment.findMany({ where: { userId: user.id }, orderBy: { isRequired: 'desc' } })
    ]);

    const currentDeployment = await prisma.deployment.findFirst({
      where: {
        userId: user.id,
        status: { in: ['SCHEDULED', 'IN_TRANSIT', 'ACTIVE'] }
      },
      orderBy: { embarkDate: 'asc' }
    });

    res.json(
      toJson({
        user,
        documents,
        assets,
        currentDeployment
      })
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// --- Deployments ---
app.get('/api/deployments', async (req, res) => {
  try {
    const { userId, registration } = req.query;
    const user = await resolveUser({ userId, registration });
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    const deployments = await prisma.deployment.findMany({
      where: { userId: user.id },
      orderBy: { embarkDate: 'desc' }
    });

    res.json(toJson({ deployments }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

app.get('/api/deployments/current', async (req, res) => {
  try {
    const { userId, registration } = req.query;
    const user = await resolveUser({ userId, registration });
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    const deployment = await prisma.deployment.findFirst({
      where: {
        userId: user.id,
        status: { in: ['SCHEDULED', 'IN_TRANSIT', 'ACTIVE'] }
      },
      orderBy: { embarkDate: 'asc' }
    });

    res.json(toJson({ deployment }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// --- Check-ins ---
app.post('/api/checkins', async (req, res) => {
  try {
    const { userId, registration, type, latitude, longitude, address, timestamp } = req.body || {};

    const user = await resolveUser({ userId, registration });
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    if (!type || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'INVALID_PAYLOAD' });
    }

    const checkIn = await prisma.checkIn.create({
      data: {
        userId: user.id,
        type,
        latitude,
        longitude,
        address: address || null,
        timestamp: timestamp ? new Date(timestamp) : new Date()
      }
    });

    res.status(201).json(toJson({ checkIn }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

app.get('/api/checkins', async (req, res) => {
  try {
    const { userId, registration, limit } = req.query;
    const user = await resolveUser({ userId, registration });
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    const checkIns = await prisma.checkIn.findMany({
      where: { userId: user.id },
      orderBy: { timestamp: 'desc' },
      take: limit ? Math.min(Number(limit), 100) : 20
    });

    res.json(toJson({ checkIns }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// --- Expenses ---
app.get('/api/expenses', async (req, res) => {
  try {
    const { userId, registration, deploymentId } = req.query;
    const user = await resolveUser({ userId, registration });
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    const expenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
        ...(deploymentId ? { deploymentId } : {})
      },
      orderBy: { date: 'desc' }
    });

    res.json(toJson({ expenses }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const { userId, registration, deploymentId, type, value, date, description, receiptUrl } = req.body || {};

    const user = await resolveUser({ userId, registration });
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    if (!type || value == null || !date) {
      return res.status(400).json({ error: 'INVALID_PAYLOAD' });
    }

    const expense = await prisma.expense.create({
      data: {
        userId: user.id,
        deploymentId: deploymentId || null,
        type,
        value,
        date: new Date(date),
        description: description || null,
        receiptUrl: receiptUrl || null
      }
    });

    res.status(201).json(toJson({ expense }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// --- Advances ---
app.get('/api/advances', async (req, res) => {
  try {
    const { userId, registration, deploymentId } = req.query;
    const user = await resolveUser({ userId, registration });
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    const advances = await prisma.advanceRequest.findMany({
      where: {
        userId: user.id,
        ...(deploymentId ? { deploymentId } : {})
      },
      orderBy: { date: 'desc' }
    });

    res.json(toJson({ advances }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

app.post('/api/advances', async (req, res) => {
  try {
    const { userId, registration, deploymentId, value, justification } = req.body || {};

    const user = await resolveUser({ userId, registration });
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    if (!deploymentId || value == null || !justification) {
      return res.status(400).json({ error: 'INVALID_PAYLOAD' });
    }

    const advance = await prisma.advanceRequest.create({
      data: {
        userId: user.id,
        deploymentId,
        value,
        justification
      }
    });

    res.status(201).json(toJson({ advance }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// --- Assets ---
app.get('/api/assets', async (req, res) => {
  try {
    const { userId, registration } = req.query;
    const user = await resolveUser({ userId, registration });
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    const assets = await prisma.assetAssignment.findMany({
      where: { userId: user.id },
      orderBy: [{ isRequired: 'desc' }, { name: 'asc' }]
    });

    res.json(toJson({ assets }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

app.patch('/api/assets/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status) return res.status(400).json({ error: 'INVALID_PAYLOAD' });

    const asset = await prisma.assetAssignment.update({
      where: { id },
      data: { status, lastConfirmedAt: new Date() }
    });

    res.json(toJson({ asset }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// --- graceful shutdown ---
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
