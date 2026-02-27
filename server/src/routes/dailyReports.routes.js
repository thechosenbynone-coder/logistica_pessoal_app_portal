import express from 'express';
import { prisma } from '../prismaClient.js';
import { employeeBodyAuth, employeeParamsAuth, handleServerError, mapDailyReport, parseDateInputOrError, parseEmployeeIdParam, parseRequiredInteger, resolvePagination, shouldUsePaginatedResponse, startOfTodayDateOnly } from '../helpers.js';

const router = express.Router();

const mapReviewAction = { APROVAR: 'APROVADO', REJEITAR: 'REJEITADO', SOLICITAR_CORRECAO: 'CORRECAO_SOLICITADA' };

const buildWhere = (query, includeQ = false) => {
  const where = {};
  if (query?.approvalStatus) where.approvalStatus = String(query.approvalStatus);
  if (query?.employeeId) where.employeeId = Number(query.employeeId);
  if (query?.date) {
    const parsed = parseDateInputOrError(query.date, 'date');
    if (parsed.value) where.reportDate = parsed.value;
  }
  if (includeQ && query?.q) {
    where.OR = [{ description: { contains: query.q, mode: 'insensitive' } }, { approvalStatus: { contains: query.q, mode: 'insensitive' } }];
  }
  return where;
};

router.get('/api/daily-reports', async (req, res) => {
  try {
    if (!shouldUsePaginatedResponse(req.query)) {
      const where = buildWhere(req.query, false);
      const rows = await prisma.dailyReport.findMany({ where, orderBy: { id: 'asc' }, include: { employee: true } });
      return res.json(rows.map(mapDailyReport));
    }

    const { page, pageSize, q } = resolvePagination(req.query);
    const where = buildWhere({ ...req.query, q }, true);

    const total = await prisma.dailyReport.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const rows = await prisma.dailyReport.findMany({ where, include: { employee: true }, orderBy: { id: 'asc' }, skip: (safePage - 1) * pageSize, take: pageSize });

    return res.json({ items: rows.map(mapDailyReport), page: safePage, pageSize, total, totalPages, hasMore: safePage < totalPages });
  } catch (error) { handleServerError(res, error, 'daily-reports-list'); }
});

router.patch('/api/daily-reports/:id/review', async (req, res) => {
  try {
    const id = parseRequiredInteger(req.params.id, 'id');
    if (id?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: id.error });
    const { action, reason, reviewedBy } = req.body || {};
    if (!String(reviewedBy || '').trim()) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'reviewedBy é obrigatório' });
    const mapped = mapReviewAction[action];
    if (!mapped) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'action inválida' });
    if (['REJEITAR', 'SOLICITAR_CORRECAO'].includes(action) && !String(reason || '').trim()) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'reason é obrigatório para esta ação' });
    const row = await prisma.dailyReport.update({ where: { id: id.value }, data: { approvalStatus: mapped, reviewedBy: String(reviewedBy).trim(), reviewedAt: new Date(), rejectionReason: action === 'APROVAR' ? null : String(reason).trim() }, include: { employee: true } });
    res.json(mapDailyReport(row));
  } catch (error) { handleServerError(res, error, 'daily-reports-review'); }
});

router.get('/api/rdo/sem-preenchimento', async (req, res) => {
  try {
    const dateParsed = parseDateInputOrError(req.query?.date, 'date');
    const targetDate = dateParsed.value || startOfTodayDateOnly();
    // Data calculada em UTC; ajuste de fuso horário aplicado via startOfTodayDateOnly().
    const [deployments, reports] = await Promise.all([
      prisma.deployment.findMany({ where: { status: 'EMBARCADO' }, select: { id: true, employeeId: true, employee: { select: { id: true, name: true, role: true } } } }),
      prisma.dailyReport.findMany({ where: { reportDate: targetDate }, select: { employeeId: true } }),
    ]);
    const filledIds = new Set(reports.map((r) => r.employeeId).filter(Boolean));
    const semRdo = deployments.filter((d) => d.employeeId && !filledIds.has(d.employeeId)).map((d) => ({ deploymentId: d.id, employee: d.employee }));
    res.json({ date: targetDate, semRdo, counts: { embarcados: deployments.length, preencheram: deployments.length - semRdo.length } });
  } catch (error) { handleServerError(res, error, 'rdo-sem-preenchimento'); }
});

router.post('/api/daily-reports/:employeeId/cobrar', async (_req, res) => res.json({ ok: true }));

router.get('/api/employees/:id/daily-reports', ...employeeParamsAuth, async (req, res) => {
  try { const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return; const rows = await prisma.dailyReport.findMany({ where: { employeeId }, include: { employee: true }, orderBy: { id: 'desc' } }); res.json(rows.map(mapDailyReport)); }
  catch (error) { handleServerError(res, error, 'daily-reports-by-employee'); }
});
router.post('/api/daily-reports', ...employeeBodyAuth, async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.employee_id || !data.description) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'employee_id e description são obrigatórios' });

    const reportDateParsed = parseDateInputOrError(data.report_date, 'report_date');
    if (reportDateParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: reportDateParsed.error });
    const clientFilledAtParsed = parseDateInputOrError(data.client_filled_at, 'client_filled_at');
    if (clientFilledAtParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: clientFilledAtParsed.error });

    let row; let created = true;
    if (data.client_id) {
      const existing = await prisma.dailyReport.findUnique({ where: { clientId: data.client_id } });
      const up = await prisma.dailyReport.upsert({ where: { clientId: data.client_id }, create: { employeeId: Number(data.employee_id), reportDate: reportDateParsed.value, description: data.description, hoursWorked: data.hours_worked ?? null, approvalStatus: data.approval_status || null, approvedBy: data.approved_by || null, clientId: data.client_id, clientFilledAt: clientFilledAtParsed.value }, update: {}, include: { employee: true } });
      row = up; created = !existing;
    } else {
      row = await prisma.dailyReport.create({ data: { employeeId: Number(data.employee_id), reportDate: reportDateParsed.value, description: data.description, hoursWorked: data.hours_worked ?? null, approvalStatus: data.approval_status || null, approvedBy: data.approved_by || null, clientFilledAt: clientFilledAtParsed.value }, include: { employee: true } });
    }
    res.status(data.client_id ? 200 : created ? 201 : 200).json(mapDailyReport(row));
  } catch (error) { handleServerError(res, error, 'daily-reports-create'); }
});

export default router;
