import express from 'express';
import { prisma } from '../prismaClient.js';
import { resolveActiveDeploymentId } from './deployments.routes.js';
import { employeeBodyAuth, employeeParamsAuth, handleServerError, mapFinancialRequest, parseDateInputOrError, parseEmployeeIdParam, parseRequiredInteger, resolvePagination, shouldUsePaginatedResponse } from '../helpers.js';

const router = express.Router();

const REVIEW_ACTION = { APROVAR: 'APROVADO', REJEITAR: 'REJEITADO', SOLICITAR_CORRECAO: 'CORRECAO_SOLICITADA' };

const INCLUDE = { employee: true, deployment: { include: { vessel: true } } };

const buildWhere = (query, includeQ = false) => {
  const where = {};
  if (query?.type) where.type = String(query.type);
  if (query?.status) where.status = String(query.status);
  if (query?.employeeId) where.employeeId = Number(query.employeeId);
  if (includeQ && query?.q) {
    where.OR = [
      { description: { contains: query.q, mode: 'insensitive' } },
      { type: { contains: query.q, mode: 'insensitive' } },
      { category: { contains: query.q, mode: 'insensitive' } },
      { status: { contains: query.q, mode: 'insensitive' } },
    ];
  }
  return where;
};

// ─── Listar ──────────────────────────────────────────────────────
router.get('/api/financial-requests', async (req, res) => {
  try {
    if (!shouldUsePaginatedResponse(req.query)) {
      const rows = await prisma.financialRequest.findMany({
        where: buildWhere(req.query),
        include: INCLUDE,
        orderBy: { createdAt: 'desc' },
      });
      return res.json(rows.map(mapFinancialRequest));
    }

    const { page, pageSize, q } = resolvePagination(req.query);
    const where = buildWhere({ ...req.query, q }, true);
    const total = await prisma.financialRequest.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const rows = await prisma.financialRequest.findMany({
      where,
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });
    return res.json({ items: rows.map(mapFinancialRequest), page: safePage, pageSize, total, totalPages, hasMore: safePage < totalPages });
  } catch (error) {
    handleServerError(res, error, 'financial-requests-list');
  }
});

// ─── Por colaborador ──────────────────────────────────────────────
router.get('/api/employees/:id/financial-requests', ...employeeParamsAuth, async (req, res) => {
  try {
    const employeeId = parseEmployeeIdParam(req, res);
    if (!employeeId) return;
    const rows = await prisma.financialRequest.findMany({
      where: { employeeId },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json(rows.map(mapFinancialRequest));
  } catch (error) {
    handleServerError(res, error, 'financial-requests-by-employee');
  }
});

// ─── Criar ────────────────────────────────────────────────────────
router.post('/api/financial-requests', ...employeeBodyAuth, async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.employee_id || !data.type || data.amount === undefined) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'employee_id, type e amount são obrigatórios' });
    }

    const clientFilledAtParsed = parseDateInputOrError(data.client_filled_at, 'client_filled_at');
    if (clientFilledAtParsed.error) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: clientFilledAtParsed.error });
    }

    const activeDeploymentId = await resolveActiveDeploymentId(data.employee_id);
    const deploymentId = data.deployment_id ? Number(data.deployment_id) : activeDeploymentId;

    let row;
    let created = true;
    if (data.client_id) {
      const existing = await prisma.financialRequest.findUnique({ where: { clientId: data.client_id } });
      row = await prisma.financialRequest.upsert({
        where: { clientId: data.client_id },
        create: {
          employeeId: Number(data.employee_id),
          type: data.type,
          category: data.category || null,
          amount: data.amount,
          description: data.description || null,
          status: data.status || 'PENDENTE',
          deploymentId,
          clientId: data.client_id,
          clientFilledAt: clientFilledAtParsed.value,
        },
        update: {},
        include: INCLUDE,
      });
      created = !existing;
    } else {
      row = await prisma.financialRequest.create({
        data: {
          employeeId: Number(data.employee_id),
          type: data.type,
          category: data.category || null,
          amount: data.amount,
          description: data.description || null,
          status: data.status || 'PENDENTE',
          deploymentId,
          clientFilledAt: clientFilledAtParsed.value,
        },
        include: INCLUDE,
      });
    }
    res.status(created ? 201 : 200).json(mapFinancialRequest(row));
  } catch (error) {
    handleServerError(res, error, 'financial-requests-create');
  }
});

// ─── Revisar (aprovar / rejeitar / solicitar correção) ────────────
router.patch('/api/financial-requests/:id/review', async (req, res) => {
  try {
    const id = parseRequiredInteger(req.params.id, 'id');
    if (id?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: id.error });

    const { action, reason, reviewedBy, payment_due_date } = req.body || {};

    if (!String(reviewedBy || '').trim()) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'reviewedBy é obrigatório' });
    }

    const newStatus = REVIEW_ACTION[action];
    if (!newStatus) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'action inválida. Use APROVAR, REJEITAR ou SOLICITAR_CORRECAO' });
    }

    if (['REJEITAR', 'SOLICITAR_CORRECAO'].includes(action) && !String(reason || '').trim()) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'reason é obrigatório para esta ação' });
    }

    if (action === 'APROVAR' && !payment_due_date) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'payment_due_date é obrigatório para aprovar' });
    }

    const paymentDueDateParsed = action === 'APROVAR'
      ? parseDateInputOrError(payment_due_date, 'payment_due_date', true)
      : { value: null };
    if (paymentDueDateParsed.error) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: paymentDueDateParsed.error });
    }

    const row = await prisma.financialRequest.update({
      where: { id: id.value },
      data: {
        status: newStatus,
        reviewedBy: String(reviewedBy).trim(),
        reviewedAt: new Date(),
        rejectionReason: action === 'APROVAR' ? null : String(reason || '').trim(),
        paymentDueDate: paymentDueDateParsed.value,
      },
      include: INCLUDE,
    });

    res.json(mapFinancialRequest(row));
  } catch (error) {
    handleServerError(res, error, 'financial-requests-review');
  }
});

export default router;
