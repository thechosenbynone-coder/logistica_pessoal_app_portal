import express from 'express';
import { prisma } from '../prismaClient.js';
import { handleServerError, mapVessel } from '../helpers.js';

const router = express.Router();

router.get('/api/vessels', async (_req, res) => { try { const rows = await prisma.vessel.findMany({ orderBy: { id: 'asc' } }); res.json(rows.map(mapVessel)); } catch (error) { handleServerError(res, error, 'vessels-list'); } });
router.post('/api/vessels', async (req, res) => {
  try { const { name, type, client } = req.body || {}; if (!name || !type) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'name e type são obrigatórios' }); const row = await prisma.vessel.create({ data: { name, type, client } }); res.status(201).json(mapVessel(row)); }
  catch (error) { handleServerError(res, error, 'vessels-create'); }
});

export default router;
