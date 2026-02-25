import express from 'express';
import { prisma } from '../prismaClient.js';
import { employeeBodyAuth, employeeParamsAuth, handleServerError, mapFinancialRequest, parseDateInputOrError, parseEmployeeIdParam, resolvePagination, shouldUsePaginatedResponse } from '../helpers.js';

const router = express.Router();

router.get('/api/financial-requests', async (req, res) => {
  try {
    const typeFilter = req.query.type ? { type: String(req.query.type) } : undefined;

    if (!shouldUsePaginatedResponse(req.query)) {
      const rows = await prisma.financialRequest.findMany({ where: typeFilter, orderBy: { id: 'asc' } });
      return res.json(rows.map(mapFinancialRequest));
    }

    const { page, pageSize, q } = resolvePagination(req.query);
    const where = q
      ? {
          AND: [
            ...(typeFilter ? [typeFilter] : []),
            {
              OR: [
                { description: { contains: q, mode: 'insensitive' } },
                { status: { contains: q, mode: 'insensitive' } },
                { type: { contains: q, mode: 'insensitive' } },
              ],
            },
          ],
        }
      : typeFilter;

    const total = await prisma.financialRequest.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const rows = await prisma.financialRequest.findMany({
      where,
      orderBy: { id: 'asc' },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });

    return res.json({
      items: rows.map(mapFinancialRequest),
      page: safePage,
      pageSize,
      total,
      totalPages,
      hasMore: safePage < totalPages,
    });
  }
  catch (error) { handleServerError(res, error, 'financial-requests-list'); }
});
router.get('/api/employees/:id/financial-requests', ...employeeParamsAuth, async (req, res) => {
  try { const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return; const rows = await prisma.financialRequest.findMany({ where: { employeeId }, orderBy: { id: 'desc' } }); res.json(rows.map(mapFinancialRequest)); }
  catch (error) { handleServerError(res, error, 'financial-requests-by-employee'); }
});
router.post('/api/financial-requests', ...employeeBodyAuth, async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.employee_id || !data.type || data.amount === undefined) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'employee_id, type e amount são obrigatórios' });

    const clientFilledAtParsed = parseDateInputOrError(data.client_filled_at, 'client_filled_at');
    if (clientFilledAtParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: clientFilledAtParsed.error });

    let row; let created = true;
    if (data.client_id) {
      const existing = await prisma.financialRequest.findUnique({ where: { clientId: data.client_id } });
      const up = await prisma.financialRequest.upsert({
        where: { clientId: data.client_id },
        create: { employeeId: Number(data.employee_id), type: data.type, amount: data.amount, description: data.description || null, status: data.status || null, clientId: data.client_id, clientFilledAt: clientFilledAtParsed.value },
        update: {},
      });
      row = up;
      created = !existing;
    } else {
      row = await prisma.financialRequest.create({ data: { employeeId: Number(data.employee_id), type: data.type, amount: data.amount, description: data.description || null, status: data.status || null, clientFilledAt: clientFilledAtParsed.value } });
    }
    res.status(data.client_id ? 200 : created ? 201 : 200).json(mapFinancialRequest(row));
  } catch (error) { handleServerError(res, error, 'financial-requests-create'); }
});

export default router;
