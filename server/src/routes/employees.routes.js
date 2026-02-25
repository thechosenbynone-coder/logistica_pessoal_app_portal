import express from 'express';
import { requireEmployeeAuth } from '../auth.js';
import { prisma } from '../prismaClient.js';
import { computeEmployeeDocStatus, startOfTodayDateOnly } from '../services/employeeDocStatus.js';
import { employeeParamsAuth, handleServerError, mapEmployee, normalizeCPF, parseEmployeeIdParam, requireAdminKeyIfConfigured, resolvePagination, shouldUsePaginatedResponse } from '../helpers.js';

const router = express.Router();

router.get('/api/employees', async (req, res) => {
  try {
    if (!shouldUsePaginatedResponse(req.query)) {
      const rows = await prisma.employee.findMany({ orderBy: { id: 'asc' } });
      return res.json(rows.map(mapEmployee));
    }

    const { page, pageSize, q } = resolvePagination(req.query);

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { cpf: { contains: q } },
            { role: { contains: q, mode: 'insensitive' } },
            { base: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
          ],
        }
      : undefined;

    const total = await prisma.employee.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const rows = await prisma.employee.findMany({
      where,
      orderBy: { id: 'asc' },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });

    return res.json({
      items: rows.map(mapEmployee),
      page: safePage,
      pageSize,
      total,
      totalPages,
      hasMore: safePage < totalPages,
    });
  } catch (error) {
    handleServerError(res, error, 'employees-list');
  }
});

router.get('/api/employees/:id', ...employeeParamsAuth, async (req, res) => {
  try { const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return; const e = await prisma.employee.findUnique({ where: { id: employeeId } }); if (!e) return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'Colaborador não encontrado' }); res.json(mapEmployee(e)); }
  catch (error) { handleServerError(res, error, 'employees-get-by-id'); }
});

router.post('/api/employees', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const data = { name: req.body?.name, cpf: req.body?.cpf, role: req.body?.role, email: req.body?.email, phone: req.body?.phone, base: req.body?.base };
    if (!data.name || !data.role || !data.cpf) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'name, role e cpf são obrigatórios' });
    data.cpf = normalizeCPF(data.cpf);
    const row = await prisma.employee.create({ data });
    res.status(201).json(mapEmployee(row));
  } catch (error) { handleServerError(res, error, 'employees-create'); }
});

router.get('/api/employees/:employeeId/notifications', requireEmployeeAuth, async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    if (!Number.isInteger(employeeId) || employeeId <= 0) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'employeeId inválido' });
    if (req.auth?.role !== 'admin' && Number(req.auth?.employee_id) !== employeeId) return res.status(403).json({ errorCode: 'FORBIDDEN', message: 'Acesso fora do escopo do colaborador' });

    await computeEmployeeDocStatus(employeeId);

    const today = startOfTodayDateOnly();
    const in15 = new Date(today);
    in15.setUTCDate(in15.getUTCDate() + 15);

    const [docsExpired, docsExpiringSoon, missingEpiSignatures, pendingFinancialRequests, pendingDailyReports, pendingServiceOrders] = await Promise.all([
      prisma.employeeDocStatus.count({ where: { employeeId, status: 'VENCIDO' } }),
      prisma.employeeDocStatus.count({ where: { employeeId, expiresAt: { gte: today, lte: in15 } } }),
      prisma.epiDelivery.count({ where: { employeeId, signatureUrl: null } }),
      prisma.financialRequest.count({ where: { employeeId, status: { in: ['Solicitado', 'Pendente'] } } }),
      prisma.dailyReport.count({ where: { employeeId, approvalStatus: { in: ['Pendente', 'PENDING'] } } }),
      prisma.serviceOrder.count({ where: { employeeId, approvalStatus: { in: ['Pendente', 'PENDING'] } } }),
    ]);

    const createdAt = new Date().toISOString();
    const notifications = [];
    if (docsExpired > 0) notifications.push({ id: 'docs-expired', type: 'docs', severity: 'high', title: 'Documentos vencidos', message: `Você tem ${docsExpired} documentos vencidos.`, createdAt, read: false });
    if (docsExpiringSoon > 0) notifications.push({ id: 'docs-expiring-soon', type: 'docs', severity: 'medium', title: 'Documentos vencendo', message: `Você tem ${docsExpiringSoon} documentos vencendo em até 15 dias.`, createdAt, read: false });
    if (missingEpiSignatures > 0) notifications.push({ id: 'epi-missing-signature', type: 'epi', severity: 'medium', title: 'EPIs pendentes de aceite', message: `Você tem ${missingEpiSignatures} entregas de EPI sem assinatura.`, createdAt, read: false });
    if (pendingFinancialRequests > 0) notifications.push({ id: 'financial-requests-pending', type: 'financial', severity: 'low', title: 'Solicitações financeiras pendentes', message: `Você tem ${pendingFinancialRequests} solicitações financeiras pendentes.`, createdAt, read: false });
    if (pendingDailyReports > 0) notifications.push({ id: 'daily-reports-pending', type: 'daily-reports', severity: 'low', title: 'RDOs pendentes', message: `Você tem ${pendingDailyReports} RDOs pendentes de aprovação.`, createdAt, read: false });
    if (pendingServiceOrders > 0) notifications.push({ id: 'service-orders-pending', type: 'service-orders', severity: 'low', title: 'Ordens de serviço pendentes', message: `Você tem ${pendingServiceOrders} ordens de serviço pendentes de aprovação.`, createdAt, read: false });
    return res.status(200).json(notifications);
  } catch (error) { handleServerError(res, error, 'employee-notifications'); }
});

router.post('/api/employees/:employeeId/notifications/read', requireEmployeeAuth, async (req, res) => {
  const employeeId = Number(req.params.employeeId);
  if (!Number.isInteger(employeeId) || employeeId <= 0) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'employeeId inválido' });
  if (req.auth?.role !== 'admin' && Number(req.auth?.employee_id) !== employeeId) return res.status(403).json({ errorCode: 'FORBIDDEN', message: 'Acesso fora do escopo do colaborador' });
  return res.json({ ok: true });
});

router.get('/api/employees/:id/doc-status', ...employeeParamsAuth, async (req, res) => {
  try {
    const employeeId = parseEmployeeIdParam(req, res);
    if (!employeeId) return;
    await computeEmployeeDocStatus(employeeId);
    const rows = await prisma.employeeDocStatus.findMany({ where: { employeeId }, orderBy: { docType: 'asc' } });
    res.json(rows.map((r) => ({ id: r.id, employee_id: r.employeeId, doc_type: r.docType, status: r.status, expires_at: r.expiresAt, computed_at: r.computedAt, vence_durante_embarque: r.venceDuranteEmbarque, risco_reembarque: r.riscoReembarque })));
  } catch (error) { handleServerError(res, error, 'employee-doc-status'); }
});

router.get('/api/profile', async (req, res) => {
  const employeeId = Number(req.auth?.employee_id);
  if (Number.isInteger(employeeId) && employeeId > 0) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    return res.json(employee ? mapEmployee(employee) : {});
  }
  return res.json({});
});

export default router;
