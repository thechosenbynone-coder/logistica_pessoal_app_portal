import express from 'express';
import { prisma } from '../prismaClient.js';
import { computeEmployeeDocStatus } from '../services/employeeDocStatus.js';
import { employeeParamsAuth, handleServerError, mapDeployment, mapDeploymentMember, parseDateInputOrError, parseEmployeeIdParam, parseRequiredInteger, requireAdminKeyIfConfigured, resolvePagination, shouldUsePaginatedResponse } from '../helpers.js';

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
      const rows = await prisma.deployment.findMany({ where: buildWhere(req.query), include: { employee: true, vessel: true, members: { include: { employee: true } } }, orderBy: { id: 'asc' } });
      return res.json(rows.map(mapDeployment));
    }

    const { page, pageSize, q } = resolvePagination(req.query);
    const where = buildWhere({ ...req.query, q }, true);
    const total = await prisma.deployment.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const rows = await prisma.deployment.findMany({ where, include: { employee: true, vessel: true, members: { include: { employee: true } } }, orderBy: { id: 'asc' }, skip: (safePage - 1) * pageSize, take: pageSize });

    return res.json({ items: rows.map(mapDeployment), page: safePage, pageSize, total, totalPages, hasMore: safePage < totalPages });
  } catch (error) { handleServerError(res, error, 'deployments-list'); }
});
router.get('/api/employees/:id/deployments', ...employeeParamsAuth, async (req, res) => {
  try { const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return; const rows = await prisma.deployment.findMany({ where: { employeeId }, include: { employee: true, vessel: true, members: { include: { employee: true } } }, orderBy: { id: 'asc' } }); res.json(rows.map(mapDeployment)); }
  catch (error) { handleServerError(res, error, 'deployments-by-employee'); }
});
router.post('/api/deployments', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.start_date || !data.end_date_expected) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'start_date e end_date_expected são obrigatórios' });
    const startDateParsed = parseDateInputOrError(data.start_date, 'start_date', true);
    if (startDateParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: startDateParsed.error });
    const endDateExpectedParsed = parseDateInputOrError(data.end_date_expected, 'end_date_expected', true);
    if (endDateExpectedParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: endDateExpectedParsed.error });
    const endDateActualParsed = parseDateInputOrError(data.end_date_actual, 'end_date_actual');
    if (endDateActualParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: endDateActualParsed.error });

    const row = await prisma.deployment.create({
      data: {
        employeeId: data.employee_id ? Number(data.employee_id) : null,
        vesselId: data.vessel_id ? Number(data.vessel_id) : null,
        startDate: startDateParsed.value,
        endDateExpected: endDateExpectedParsed.value,
        endDateActual: endDateActualParsed.value,
        notes: data.notes || null,
        status: data.status || undefined,
        transportType: data.transport_type || null,
        departureHub: data.departure_hub || null,
        serviceType: data.service_type || null,
      },
      include: { employee: true, vessel: true, members: { include: { employee: true } } },
    });
    if (data.employee_id) {
      await computeEmployeeDocStatus(Number(data.employee_id));
    }
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
    const updated = await prisma.deployment.update({ where: { id: id.value }, data: { status: target }, include: { employee: true, vessel: true, members: { include: { employee: true } } } });
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


// ─── Membros do embarque ─────────────────────────────────────────

router.get('/api/deployments/:id/members', async (req, res) => {
  try {
    const id = parseRequiredInteger(req.params.id, 'id');
    if (id?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: id.error });

    const members = await prisma.deploymentMember.findMany({
      where: { deploymentId: id.value },
      include: { employee: true },
      orderBy: { addedAt: 'asc' },
    });

    res.json(members.map(mapDeploymentMember));
  } catch (error) { handleServerError(res, error, 'deployment-members-list'); }
});

router.post('/api/deployments/:id/members', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const id = parseRequiredInteger(req.params.id, 'id');
    if (id?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: id.error });

    const employeeId = Number(req.body?.employee_id);
    if (!employeeId || !Number.isInteger(employeeId)) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'employee_id é obrigatório' });
    }

    const existing = await prisma.deploymentMember.findUnique({
      where: { deploymentId_employeeId: { deploymentId: id.value, employeeId } },
    });
    if (existing) {
      return res.status(409).json({ errorCode: 'ALREADY_MEMBER', message: 'Colaborador já está neste embarque' });
    }

    const activeDeployment = await prisma.deploymentMember.findFirst({
      where: {
        employeeId,
        deploymentId: { not: id.value },
        deployment: { status: 'EMBARCADO' },
      },
    });

    await computeEmployeeDocStatus(employeeId);
    const docStatuses = await prisma.employeeDocStatus.findMany({
      where: { employeeId },
    });

    const vencidos = docStatuses.filter((d) => d.status === 'VENCIDO');
    const atencao = docStatuses.filter((d) => ['VENCENDO', 'VENCE_NO_EMBARQUE', 'RISCO_REEMBARQUE'].includes(d.status));

    let gateStatus = 'APTO';
    const notes = [];

    if (activeDeployment) {
      gateStatus = 'NAO_APTO';
      notes.push('Colaborador já está embarcado em outro embarque ativo.');
    }

    if (vencidos.length > 0) {
      gateStatus = 'NAO_APTO';
      notes.push(`Documentos vencidos: ${vencidos.map((d) => d.docType).join(', ')}`);
    }

    if (gateStatus === 'APTO' && atencao.length > 0) {
      gateStatus = 'ATENCAO';
      notes.push(`Documentos próximos do vencimento: ${atencao.map((d) => d.docType).join(', ')}`);
    }

    const member = await prisma.deploymentMember.create({
      data: {
        deploymentId: id.value,
        employeeId,
        gateStatus,
        gateNotes: notes.length > 0 ? notes.join(' | ') : null,
      },
      include: { employee: true },
    });

    res.status(201).json(mapDeploymentMember(member));
  } catch (error) { handleServerError(res, error, 'deployment-members-add'); }
});

router.delete('/api/deployments/:id/members/:employeeId', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const id = parseRequiredInteger(req.params.id, 'id');
    if (id?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: id.error });

    const employeeId = Number(req.params.employeeId);
    if (!employeeId) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'employeeId inválido' });

    await prisma.deploymentMember.deleteMany({
      where: { deploymentId: id.value, employeeId },
    });

    res.status(204).send();
  } catch (error) { handleServerError(res, error, 'deployment-members-remove'); }
});

export default router;
