import express from 'express';
import { prisma } from '../prismaClient.js';
import { computeEmployeeDocStatus } from '../services/employeeDocStatus.js';
import { employeeParamsAuth, handleServerError, mapDeployment, parseDateInputOrError, parseEmployeeIdParam, parseRequiredInteger, requireAdminKeyIfConfigured, resolvePagination, shouldUsePaginatedResponse } from '../helpers.js';

const router = express.Router();
const transitions = {
  PLANEJADO: ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['DOCS_OK', 'CANCELADO'],
  DOCS_OK: ['EMBARCADO', 'CANCELADO'],
  EMBARCADO: ['CONCLUIDO', 'CANCELADO'],
  CONCLUIDO: [],
  CANCELADO: [],
};

const buildWhere = (query, includeQ = false) => {
  const where = {};
  if (query?.status) where.status = String(query.status);
  if (query?.vesselId) where.vesselId = Number(query.vesselId);
  if (query?.employeeId) where.employeeId = Number(query.employeeId);
  if (includeQ && query?.q) where.OR = [{ notes: { contains: query.q, mode: 'insensitive' } }];
  return where;
};

router.get('/api/deployments', async (req, res) => {
  try {
    if (!shouldUsePaginatedResponse(req.query)) {
      const rows = await prisma.deployment.findMany({ where: buildWhere(req.query), include: { employee: true, vessel: true }, orderBy: { id: 'asc' } });
      return res.json(rows.map(mapDeployment));
    }

    const { page, pageSize, q } = resolvePagination(req.query);
    const where = buildWhere({ ...req.query, q }, true);
    const total = await prisma.deployment.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const rows = await prisma.deployment.findMany({ where, include: { employee: true, vessel: true }, orderBy: { id: 'asc' }, skip: (safePage - 1) * pageSize, take: pageSize });

    return res.json({ items: rows.map(mapDeployment), page: safePage, pageSize, total, totalPages, hasMore: safePage < totalPages });
  } catch (error) { handleServerError(res, error, 'deployments-list'); }
});
router.get('/api/employees/:id/deployments', ...employeeParamsAuth, async (req, res) => {
  try { const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return; const rows = await prisma.deployment.findMany({ where: { employeeId }, include: { employee: true, vessel: true }, orderBy: { id: 'asc' } }); res.json(rows.map(mapDeployment)); }
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

    const row = await prisma.deployment.create({ data: { employeeId: Number(data.employee_id), vesselId: data.vessel_id ? Number(data.vessel_id) : null, startDate: startDateParsed.value, endDateExpected: endDateExpectedParsed.value, endDateActual: endDateActualParsed.value, notes: data.notes || null, status: data.status || undefined, transportType: data.transport_type || null, departureHub: data.departure_hub || null }, include: { employee: true, vessel: true } });
    await computeEmployeeDocStatus(Number(data.employee_id));
    res.status(201).json(mapDeployment(row));
  } catch (error) { handleServerError(res, error, 'deployments-create'); }
});

router.patch('/api/deployments/:id/status', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const id = parseRequiredInteger(req.params.id, 'id');
    if (id?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: id.error });
    const target = String(req.body?.status || '');
    const deployment = await prisma.deployment.findUnique({ where: { id: id.value } });
    if (!deployment) return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'Deployment não encontrado' });
    if (!transitions[deployment.status]?.includes(target)) {
      return res.status(400).json({ errorCode: 'INVALID_TRANSITION', message: `Transição inválida de ${deployment.status} para ${target}` });
    }
    const updated = await prisma.deployment.update({ where: { id: id.value }, data: { status: target }, include: { employee: true, vessel: true } });
    res.json(mapDeployment(updated));
  } catch (error) { handleServerError(res, error, 'deployments-status-update'); }
});

router.get('/api/deployments/:id/tickets', async (req, res) => {
  try {
    const id = parseRequiredInteger(req.params.id, 'id');
    if (id?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: id.error });
    const rows = await prisma.deploymentTicket.findMany({ where: { deploymentId: id.value }, orderBy: { id: 'asc' } });
    res.json(rows);
  } catch (error) { handleServerError(res, error, 'deployment-tickets-list'); }
});

router.post('/api/deployments/:id/tickets', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const id = parseRequiredInteger(req.params.id, 'id');
    if (id?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: id.error });
    if (!String(req.body?.type || '').trim()) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'type é obrigatório' });
    const row = await prisma.deploymentTicket.create({ data: { deploymentId: id.value, type: String(req.body.type), provider: req.body.provider || null, locator: req.body.locator || null, departure: req.body.departure ? new Date(req.body.departure) : null, arrival: req.body.arrival ? new Date(req.body.arrival) : null, origin: req.body.origin || null, destination: req.body.destination || null, fileUrl: req.body.fileUrl || null, notes: req.body.notes || null } });
    res.status(201).json(row);
  } catch (error) { handleServerError(res, error, 'deployment-tickets-create'); }
});

router.delete('/api/deployments/:id/tickets/:tid', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const tid = parseRequiredInteger(req.params.tid, 'tid');
    if (tid?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: tid.error });
    await prisma.deploymentTicket.delete({ where: { id: tid.value } });
    res.status(204).send();
  } catch (error) { handleServerError(res, error, 'deployment-tickets-delete'); }
});

export default router;
