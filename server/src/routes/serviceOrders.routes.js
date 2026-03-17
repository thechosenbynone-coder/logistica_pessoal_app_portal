import express from 'express';
import { prisma } from '../prismaClient.js';
import { resolveActiveDeploymentId } from './deployments.routes.js';
import {
  employeeBodyAuth,
  employeeParamsAuth,
  handleServerError,
  mapServiceOrder,
  parseDateInputOrError,
  parseEmployeeIdParam,
  parseRequiredInteger,
  resolvePagination,
  shouldUsePaginatedResponse,
} from '../helpers.js';

const router = express.Router();
const mapReviewAction = {
  APROVAR: 'APROVADO',
  REJEITAR: 'REJEITADO',
  SOLICITAR_CORRECAO: 'CORRECAO_SOLICITADA',
};

const buildWhere = (query, includeQ = false) => {
  const where = {};
  if (query?.approvalStatus) where.approvalStatus = String(query.approvalStatus);
  if (query?.employeeId) where.employeeId = Number(query.employeeId);
  if (includeQ && query?.q) {
    where.OR = [
      { osNumber: { contains: query.q, mode: 'insensitive' } },
      { title: { contains: query.q, mode: 'insensitive' } },
      { description: { contains: query.q, mode: 'insensitive' } },
      { status: { contains: query.q, mode: 'insensitive' } },
      { approvalStatus: { contains: query.q, mode: 'insensitive' } },
    ];
  }
  return where;
};

router.get('/api/service-orders', async (req, res) => {
  try {
    if (!shouldUsePaginatedResponse(req.query)) {
      const rows = await prisma.serviceOrder.findMany({
        where: buildWhere(req.query),
        include: { employee: true, vessel: true, deployment: { include: { vessel: true } } },
        orderBy: { id: 'asc' },
      });
      return res.json(rows.map(mapServiceOrder));
    }

    const { page, pageSize, q } = resolvePagination(req.query);
    const where = buildWhere({ ...req.query, q }, true);
    const total = await prisma.serviceOrder.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const rows = await prisma.serviceOrder.findMany({
      where,
      include: { employee: true, vessel: true, deployment: { include: { vessel: true } } },
      orderBy: { id: 'asc' },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });

    return res.json({
      items: rows.map(mapServiceOrder),
      page: safePage,
      pageSize,
      total,
      totalPages,
      hasMore: safePage < totalPages,
    });
  } catch (error) {
    handleServerError(res, error, 'service-orders-list');
  }
});

router.patch('/api/service-orders/:id/review', async (req, res) => {
  try {
    const id = parseRequiredInteger(req.params.id, 'id');
    if (id?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: id.error });
    const { action, reason, reviewedBy } = req.body || {};
    if (!String(reviewedBy || '').trim())
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'reviewedBy é obrigatório' });
    const mapped = mapReviewAction[action];
    if (!mapped)
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'action inválida' });
    if (['REJEITAR', 'SOLICITAR_CORRECAO'].includes(action) && !String(reason || '').trim())
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'reason é obrigatório para esta ação' });
    const row = await prisma.serviceOrder.update({
      where: { id: id.value },
      data: {
        approvalStatus: mapped,
        reviewedBy: String(reviewedBy).trim(),
        reviewedAt: new Date(),
        rejectionReason: action === 'APROVAR' ? null : String(reason).trim(),
      },
      include: { employee: true, vessel: true, deployment: { include: { vessel: true } } },
    });
    res.json(mapServiceOrder(row));
  } catch (error) {
    handleServerError(res, error, 'service-orders-review');
  }
});

router.get('/api/employees/:id/service-orders', ...employeeParamsAuth, async (req, res) => {
  try {
    const employeeId = parseEmployeeIdParam(req, res);
    if (!employeeId) return;
    const rows = await prisma.serviceOrder.findMany({
      where: { employeeId },
      include: { employee: true, vessel: true, deployment: { include: { vessel: true } } },
      orderBy: { id: 'desc' },
    });
    res.json(rows.map(mapServiceOrder));
  } catch (error) {
    handleServerError(res, error, 'service-orders-by-employee');
  }
});

router.post('/api/service-orders', ...employeeBodyAuth, async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.description)
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'description é obrigatório' });

    // ── Bloqueia criação se colaborador não estiver EMBARCADO ──
    if (data.employee_id) {
      const emp = await prisma.employee.findUnique({
        where: { id: Number(data.employee_id) },
        select: { currentStatus: true, name: true },
      });
      if (emp && emp.currentStatus !== 'EMBARCADO') {
        return res.status(403).json({
          errorCode: 'NOT_EMBARCADO',
          message: `OS só pode ser criada quando o colaborador está embarcado. Status atual: ${emp.currentStatus || 'BASE'}`,
        });
      }
    }

    const openedAtParsed = parseDateInputOrError(data.opened_at, 'opened_at');
    if (openedAtParsed.error)
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: openedAtParsed.error });
    const clientFilledAtParsed = parseDateInputOrError(data.client_filled_at, 'client_filled_at');
    if (clientFilledAtParsed.error)
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: clientFilledAtParsed.error });

    const osNumber = data.os_number || `OS-${Date.now()}`;
    let row;
    let created = true;

    if (data.client_id) {
      const existing = await prisma.serviceOrder.findUnique({ where: { clientId: data.client_id } });
      const up = await prisma.serviceOrder.upsert({
        where: { clientId: data.client_id },
        create: {
          employeeId: data.employee_id ? Number(data.employee_id) : null,
          osNumber,
          title: data.title || null,
          description: data.description,
          priority: data.priority || null,
          openedAt: openedAtParsed.value,
          approvalStatus: data.approval_status || null,
          vesselId: data.vessel_id ? Number(data.vessel_id) : null,
          status: data.status || null,
          clientId: data.client_id,
          clientFilledAt: clientFilledAtParsed.value,
          deploymentId: data.deployment_id
            ? Number(data.deployment_id)
            : await resolveActiveDeploymentId(data.employee_id),
        },
        update: {},
        include: { employee: true, vessel: true, deployment: { include: { vessel: true } } },
      });
      row = up;
      created = !existing;
    } else {
      const activeDeploymentId = await resolveActiveDeploymentId(data.employee_id);
      row = await prisma.serviceOrder.create({
        data: {
          employeeId: data.employee_id ? Number(data.employee_id) : null,
          osNumber,
          title: data.title || null,
          description: data.description,
          priority: data.priority || null,
          openedAt: openedAtParsed.value,
          approvalStatus: data.approval_status || null,
          vesselId: data.vessel_id ? Number(data.vessel_id) : null,
          status: data.status || null,
          clientFilledAt: clientFilledAtParsed.value,
          deploymentId: data.deployment_id ? Number(data.deployment_id) : activeDeploymentId,
        },
        include: { employee: true, vessel: true, deployment: { include: { vessel: true } } },
      });
    }

    res.status(data.client_id ? 200 : created ? 201 : 200).json(mapServiceOrder(row));
  } catch (error) {
    handleServerError(res, error, 'service-orders-create');
  }
});

export default router;
