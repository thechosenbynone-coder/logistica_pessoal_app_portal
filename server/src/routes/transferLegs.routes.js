import express from 'express';
import { prisma } from '../prismaClient.js';
import { handleServerError, parseRequiredInteger } from '../helpers.js';

const router = express.Router();

router.get('/api/deployments/:id/transfer-legs', async (req, res) => {
  try {
    const deploymentId = parseRequiredInteger(req.params.id, 'id');
    if (deploymentId?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: deploymentId.error });

    const legs = await prisma.transferLeg.findMany({
      where: { deploymentId: deploymentId.value },
      include: { employee: true },
      orderBy: [
        { employeeId: 'asc' },
        { sequence: 'asc' }
      ]
    });
    
    res.json(legs);
  } catch (error) {
    handleServerError(res, error, 'transfer-legs-list');
  }
});

router.post('/api/deployments/:id/transfer-legs', async (req, res) => {
  try {
    const deploymentId = parseRequiredInteger(req.params.id, 'id');
    if (deploymentId?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: deploymentId.error });

    const { employee_id, type, origin, destination, scheduledAt, provider, locator, cost, notes } = req.body || {};
    
    if (!employee_id || !type) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'employee_id e type são obrigatórios' });
    }

    const existing = await prisma.transferLeg.findMany({
      where: { deploymentId: deploymentId.value, employeeId: Number(employee_id) },
      orderBy: { sequence: 'desc' },
      take: 1
    });
    const sequence = existing.length > 0 ? existing[0].sequence + 1 : 0;

    const leg = await prisma.transferLeg.create({
      data: {
        deploymentId: deploymentId.value,
        employeeId: Number(employee_id),
        sequence,
        type,
        origin,
        destination,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        provider,
        locator,
        cost: cost !== undefined && cost !== null ? Number(cost) : null,
        notes,
        status: 'PENDENTE'
      },
      include: { employee: true }
    });

    res.status(201).json(leg);
  } catch (error) {
    handleServerError(res, error, 'transfer-legs-create');
  }
});

router.patch('/api/deployments/:id/transfer-legs/:legId', async (req, res) => {
  try {
    const deploymentId = parseRequiredInteger(req.params.id, 'id');
    if (deploymentId?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: deploymentId.error });
    
    const legId = parseRequiredInteger(req.params.legId, 'legId');
    if (legId?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: legId.error });

    const data = req.body || {};
    
    const updateData = {
      ...(data.type !== undefined && { type: data.type }),
      ...(data.origin !== undefined && { origin: data.origin }),
      ...(data.destination !== undefined && { destination: data.destination }),
      ...(data.scheduledAt !== undefined && { scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null }),
      ...(data.actualAt !== undefined && { actualAt: data.actualAt ? new Date(data.actualAt) : null }),
      ...(data.provider !== undefined && { provider: data.provider }),
      ...(data.locator !== undefined && { locator: data.locator }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.cost !== undefined && { cost: data.cost !== null ? Number(data.cost) : null }),
      ...(data.notes !== undefined && { notes: data.notes }),
    };

    const leg = await prisma.transferLeg.update({
      where: { id: legId.value },
      data: updateData,
      include: { employee: true }
    });

    res.json(leg);
  } catch (error) {
    handleServerError(res, error, 'transfer-legs-update');
  }
});

router.delete('/api/deployments/:id/transfer-legs/:legId', async (req, res) => {
  try {
    const deploymentId = parseRequiredInteger(req.params.id, 'id');
    if (deploymentId?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: deploymentId.error });
    
    const legId = parseRequiredInteger(req.params.legId, 'legId');
    if (legId?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: legId.error });

    await prisma.transferLeg.delete({
      where: { id: legId.value }
    });

    res.status(204).send();
  } catch (error) {
    handleServerError(res, error, 'transfer-legs-delete');
  }
});

export default router;
