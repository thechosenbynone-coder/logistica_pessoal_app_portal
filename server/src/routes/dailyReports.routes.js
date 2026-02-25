import express from 'express';
import { prisma } from '../prismaClient.js';
import { employeeBodyAuth, employeeParamsAuth, handleServerError, mapDailyReport, parseDateInputOrError, parseEmployeeIdParam, resolvePagination, shouldUsePaginatedResponse } from '../helpers.js';

const router = express.Router();

router.get('/api/daily-reports', async (req, res) => {
  try {
    if (!shouldUsePaginatedResponse(req.query)) {
      const rows = await prisma.dailyReport.findMany({ orderBy: { id: 'asc' } });
      return res.json(rows.map(mapDailyReport));
    }

    const { page, pageSize, q } = resolvePagination(req.query);
    const where = q
      ? {
          OR: [
            { description: { contains: q, mode: 'insensitive' } },
            { approvalStatus: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined;

    const total = await prisma.dailyReport.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const rows = await prisma.dailyReport.findMany({
      where,
      orderBy: { id: 'asc' },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });

    return res.json({
      items: rows.map(mapDailyReport),
      page: safePage,
      pageSize,
      total,
      totalPages,
      hasMore: safePage < totalPages,
    });
  } catch (error) { handleServerError(res, error, 'daily-reports-list'); }
});
router.get('/api/employees/:id/daily-reports', ...employeeParamsAuth, async (req, res) => {
  try { const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return; const rows = await prisma.dailyReport.findMany({ where: { employeeId }, orderBy: { id: 'desc' } }); res.json(rows.map(mapDailyReport)); }
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
      const up = await prisma.dailyReport.upsert({
        where: { clientId: data.client_id },
        create: { employeeId: Number(data.employee_id), reportDate: reportDateParsed.value, description: data.description, hoursWorked: data.hours_worked ?? null, approvalStatus: data.approval_status || null, approvedBy: data.approved_by || null, clientId: data.client_id, clientFilledAt: clientFilledAtParsed.value },
        update: {},
      });
      row = up;
      created = !existing;
    } else {
      row = await prisma.dailyReport.create({ data: { employeeId: Number(data.employee_id), reportDate: reportDateParsed.value, description: data.description, hoursWorked: data.hours_worked ?? null, approvalStatus: data.approval_status || null, approvedBy: data.approved_by || null, clientFilledAt: clientFilledAtParsed.value } });
    }
    res.status(data.client_id ? 200 : created ? 201 : 200).json(mapDailyReport(row));
  } catch (error) { handleServerError(res, error, 'daily-reports-create'); }
});

export default router;
