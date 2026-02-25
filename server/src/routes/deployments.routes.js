import express from 'express';
import { prisma } from '../prismaClient.js';
import { computeEmployeeDocStatus } from '../services/employeeDocStatus.js';
import { employeeParamsAuth, handleServerError, mapDeployment, parseDateInputOrError, parseEmployeeIdParam, requireAdminKeyIfConfigured, resolvePagination, shouldUsePaginatedResponse } from '../helpers.js';

const router = express.Router();

router.get('/api/deployments', async (req, res) => {
  try {
    if (!shouldUsePaginatedResponse(req.query)) {
      const rows = await prisma.deployment.findMany({ orderBy: { id: 'asc' } });
      return res.json(rows.map(mapDeployment));
    }

    const { page, pageSize, q } = resolvePagination(req.query);
    const where = q
      ? {
          OR: [{ notes: { contains: q, mode: 'insensitive' } }],
        }
      : undefined;
    const total = await prisma.deployment.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const rows = await prisma.deployment.findMany({
      where,
      orderBy: { id: 'asc' },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });

    return res.json({
      items: rows.map(mapDeployment),
      page: safePage,
      pageSize,
      total,
      totalPages,
      hasMore: safePage < totalPages,
    });
  } catch (error) { handleServerError(res, error, 'deployments-list'); }
});
router.get('/api/employees/:id/deployments', ...employeeParamsAuth, async (req, res) => {
  try { const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return; const rows = await prisma.deployment.findMany({ where: { employeeId }, orderBy: { id: 'asc' } }); res.json(rows.map(mapDeployment)); }
  catch (error) { handleServerError(res, error, 'deployments-by-employee'); }
});
router.post('/api/deployments', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.employee_id || !data.start_date || !data.end_date_expected) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'employee_id, start_date, end_date_expected são obrigatórios' });
    const startDateParsed = parseDateInputOrError(data.start_date, 'start_date', true);
    if (startDateParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: startDateParsed.error });
    const endDateExpectedParsed = parseDateInputOrError(data.end_date_expected, 'end_date_expected', true);
    if (endDateExpectedParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: endDateExpectedParsed.error });
    const endDateActualParsed = parseDateInputOrError(data.end_date_actual, 'end_date_actual');
    if (endDateActualParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: endDateActualParsed.error });

    const row = await prisma.deployment.create({ data: { employeeId: Number(data.employee_id), vesselId: data.vessel_id ? Number(data.vessel_id) : null, startDate: startDateParsed.value, endDateExpected: endDateExpectedParsed.value, endDateActual: endDateActualParsed.value, notes: data.notes || null } });
    await computeEmployeeDocStatus(Number(data.employee_id));
    res.status(201).json(mapDeployment(row));
  } catch (error) { handleServerError(res, error, 'deployments-create'); }
});

export default router;
