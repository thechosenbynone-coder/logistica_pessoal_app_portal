import express from 'express';
import { prisma } from '../prismaClient.js';
import {
  handleServerError,
  mapTool,
  mapToolAssignment,
  parseRequiredInteger,
  requireAdminKeyIfConfigured,
} from '../helpers.js';

const router = express.Router();

router.get('/api/tools', async (_req, res) => {
  try {
    const rows = await prisma.tool.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    res.json(rows.map(mapTool));
  } catch (error) {
    handleServerError(res, error, 'tools-list');
  }
});

router.post('/api/tools', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const data = req.body || {};
    if (!String(data.name || '').trim()) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'name é obrigatório' });
    }

    const row = await prisma.tool.create({
      data: {
        name: String(data.name).trim(),
        code: data.code || null,
        type: data.type || null,
        notes: data.notes || null,
      },
    });

    res.status(201).json(mapTool(row));
  } catch (error) {
    handleServerError(res, error, 'tools-create');
  }
});

router.get('/api/deployments/:id/tools', async (req, res) => {
  try {
    const id = parseRequiredInteger(req.params.id, 'id');
    if (id?.error) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: id.error });
    }

    const rows = await prisma.toolAssignment.findMany({
      where: { deploymentId: id.value },
      include: { tool: true, employee: true },
      orderBy: { assignedAt: 'asc' },
    });

    res.json(rows.map(mapToolAssignment));
  } catch (error) {
    handleServerError(res, error, 'tool-assignments-list');
  }
});

router.post('/api/deployments/:id/tools', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const id = parseRequiredInteger(req.params.id, 'id');
    if (id?.error) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: id.error });
    }

    const toolId = Number(req.body?.tool_id);
    const employeeId = Number(req.body?.employee_id);
    if (!toolId || !employeeId) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'tool_id e employee_id são obrigatórios',
      });
    }

    const existing = await prisma.toolAssignment.findFirst({
      where: { toolId, deploymentId: id.value, status: 'ATRIBUIDA' },
    });
    if (existing) {
      return res.status(409).json({
        errorCode: 'ALREADY_ASSIGNED',
        message: 'Ferramenta já está atribuída neste embarque',
      });
    }

    const row = await prisma.toolAssignment.create({
      data: {
        toolId,
        deploymentId: id.value,
        employeeId,
        notes: req.body?.notes || null,
      },
      include: { tool: true, employee: true },
    });

    res.status(201).json(mapToolAssignment(row));
  } catch (error) {
    handleServerError(res, error, 'tool-assignments-create');
  }
});

router.patch(
  '/api/deployments/:id/tools/:assignmentId/status',
  requireAdminKeyIfConfigured,
  async (req, res) => {
    try {
      const id = parseRequiredInteger(req.params.id, 'id');
      if (id?.error) {
        return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: id.error });
      }
      const assignmentId = parseRequiredInteger(req.params.assignmentId, 'assignmentId');
      if (assignmentId?.error) {
        return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: assignmentId.error });
      }

      const newStatus = String(req.body?.status || '');
      if (!['DEVOLVIDA', 'EXTRAVIADA'].includes(newStatus)) {
        return res.status(400).json({
          errorCode: 'VALIDATION_ERROR',
          message: 'status deve ser DEVOLVIDA ou EXTRAVIADA',
        });
      }

      const row = await prisma.toolAssignment.update({
        where: { id: assignmentId.value },
        data: {
          status: newStatus,
          returnedAt: new Date(),
          ...(req.body?.notes !== undefined && { notes: req.body.notes }),
        },
        include: { tool: true, employee: true },
      });

      res.json(mapToolAssignment(row));
    } catch (error) {
      handleServerError(res, error, 'tool-assignments-status');
    }
  }
);

router.delete(
  '/api/deployments/:id/tools/:assignmentId',
  requireAdminKeyIfConfigured,
  async (req, res) => {
    try {
      const assignmentId = parseRequiredInteger(req.params.assignmentId, 'assignmentId');
      if (assignmentId?.error) {
        return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: assignmentId.error });
      }

      await prisma.toolAssignment.delete({ where: { id: assignmentId.value } });
      res.status(204).send();
    } catch (error) {
      handleServerError(res, error, 'tool-assignments-delete');
    }
  }
);

export default router;
