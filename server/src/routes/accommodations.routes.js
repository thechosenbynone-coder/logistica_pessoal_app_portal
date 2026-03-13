import express from 'express';
import { prisma } from '../prismaClient.js';
import {
  handleServerError,
  mapAccommodation,
  parseRequiredInteger,
  parseDateInputOrError,
  requireAdminKeyIfConfigured,
} from '../helpers.js';

const router = express.Router();

const INCLUDE = { employee: true };

// GET /api/deployments/:id/accommodations
router.get('/api/deployments/:id/accommodations', async (req, res) => {
  try {
    const id = parseRequiredInteger(req.params.id, 'id');
    if (id?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: id.error });

    const rows = await prisma.accommodation.findMany({
      where: { deploymentId: id.value },
      include: INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    res.json(rows.map(mapAccommodation));
  } catch (error) {
    handleServerError(res, error, 'accommodations-list');
  }
});

// POST /api/deployments/:id/accommodations
router.post('/api/deployments/:id/accommodations', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const id = parseRequiredInteger(req.params.id, 'id');
    if (id?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: id.error });

    const employeeId = Number(req.body?.employee_id);
    if (!employeeId) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'employee_id é obrigatório' });
    }

    const checkIn = parseDateInputOrError(req.body?.check_in, 'check_in');
    if (checkIn.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: checkIn.error });

    const checkOut = parseDateInputOrError(req.body?.check_out, 'check_out');
    if (checkOut.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: checkOut.error });

    const row = await prisma.accommodation.create({
      data: {
        deploymentId: id.value,
        employeeId,
        type: req.body?.type || 'HOTEL',
        providerName: req.body?.provider_name || null,
        checkIn: checkIn.value,
        checkOut: checkOut.value,
        address: req.body?.address || null,
        confirmationCode: req.body?.confirmation_code || null,
        notes: req.body?.notes || null,
        status: req.body?.status || 'PENDENTE',
      },
      include: INCLUDE,
    });
    res.status(201).json(mapAccommodation(row));
  } catch (error) {
    handleServerError(res, error, 'accommodations-create');
  }
});

// PATCH /api/deployments/:id/accommodations/:accommodationId
router.patch('/api/deployments/:id/accommodations/:accommodationId', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const accommodationId = parseRequiredInteger(req.params.accommodationId, 'accommodationId');
    if (accommodationId?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: accommodationId.error });

    const checkIn = parseDateInputOrError(req.body?.check_in, 'check_in');
    if (checkIn.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: checkIn.error });

    const checkOut = parseDateInputOrError(req.body?.check_out, 'check_out');
    if (checkOut.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: checkOut.error });

    const row = await prisma.accommodation.update({
      where: { id: accommodationId.value },
      data: {
        ...(req.body?.type !== undefined && { type: req.body.type }),
        ...(req.body?.provider_name !== undefined && { providerName: req.body.provider_name }),
        ...(checkIn.value !== null && { checkIn: checkIn.value }),
        ...(checkOut.value !== null && { checkOut: checkOut.value }),
        ...(req.body?.address !== undefined && { address: req.body.address }),
        ...(req.body?.confirmation_code !== undefined && { confirmationCode: req.body.confirmation_code }),
        ...(req.body?.notes !== undefined && { notes: req.body.notes }),
        ...(req.body?.status !== undefined && { status: req.body.status }),
      },
      include: INCLUDE,
    });
    res.json(mapAccommodation(row));
  } catch (error) {
    handleServerError(res, error, 'accommodations-update');
  }
});

// DELETE /api/deployments/:id/accommodations/:accommodationId
router.delete('/api/deployments/:id/accommodations/:accommodationId', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const accommodationId = parseRequiredInteger(req.params.accommodationId, 'accommodationId');
    if (accommodationId?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: accommodationId.error });

    await prisma.accommodation.delete({ where: { id: accommodationId.value } });
    res.status(204).send();
  } catch (error) {
    handleServerError(res, error, 'accommodations-delete');
  }
});

// GET /api/accommodations/pendentes-count
// Retorna número de embarques ativos/planejados nos próximos 14 dias
// que possuem membros sem hospedagem CONFIRMADA
router.get('/api/accommodations/pendentes-count', async (_req, res) => {
  try {
    const today = new Date();
    const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    const deployments = await prisma.deployment.findMany({
      where: {
        status: { in: ['PLANEJADO', 'CONFIRMADO', 'DOCS_OK', 'EMBARCADO'] },
        startDate: { lte: in14Days },
      },
      include: {
        members: true,
        accommodations: { where: { status: 'CONFIRMADO' } },
      },
    });

    let count = 0;
    for (const d of deployments) {
      if (d.members.length === 0) continue;
      const confirmedIds = new Set(d.accommodations.map((a) => a.employeeId));
      const hasPending = d.members.some((m) => !confirmedIds.has(m.employeeId));
      if (hasPending) count++;
    }

    res.json({ count });
  } catch (error) {
    handleServerError(res, error, 'accommodations-pendentes-count');
  }
});

export default router;
