import express from 'express';
import { prisma } from '../prismaClient.js';
import { employeeBodyAuth, employeeParamsAuth, handleServerError, mapServiceOrder, parseDateInputOrError, parseEmployeeIdParam, resolvePagination, shouldUsePaginatedResponse } from '../helpers.js';

const router = express.Router();

router.get('/api/service-orders', async (req, res) => {
  try {
    if (!shouldUsePaginatedResponse(req.query)) {
      const rows = await prisma.serviceOrder.findMany({ orderBy: { id: 'asc' } });
      return res.json(rows.map(mapServiceOrder));
    }

    const { page, pageSize, q } = resolvePagination(req.query);
    const where = q
      ? {
          OR: [
            { osNumber: { contains: q, mode: 'insensitive' } },
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { status: { contains: q, mode: 'insensitive' } },
            { approvalStatus: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined;

    const total = await prisma.serviceOrder.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const rows = await prisma.serviceOrder.findMany({
      where,
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
  } catch (error) { handleServerError(res, error, 'service-orders-list'); }
});
router.get('/api/employees/:id/service-orders', ...employeeParamsAuth, async (req, res) => {
  try { const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return; const rows = await prisma.serviceOrder.findMany({ where: { employeeId }, orderBy: { id: 'desc' } }); res.json(rows.map(mapServiceOrder)); }
  catch (error) { handleServerError(res, error, 'service-orders-by-employee'); }
});
router.post('/api/service-orders', ...employeeBodyAuth, async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.description) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'description é obrigatório' });

    const openedAtParsed = parseDateInputOrError(data.opened_at, 'opened_at');
    if (openedAtParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: openedAtParsed.error });
    const clientFilledAtParsed = parseDateInputOrError(data.client_filled_at, 'client_filled_at');
    if (clientFilledAtParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: clientFilledAtParsed.error });

    const osNumber = data.os_number || `OS-${Date.now()}`;
    let row; let created = true;
    if (data.client_id) {
      const existing = await prisma.serviceOrder.findUnique({ where: { clientId: data.client_id } });
      const up = await prisma.serviceOrder.upsert({
        where: { clientId: data.client_id },
        create: { employeeId: data.employee_id ? Number(data.employee_id) : null, osNumber, title: data.title || null, description: data.description, priority: data.priority || null, openedAt: openedAtParsed.value, approvalStatus: data.approval_status || null, vesselId: data.vessel_id ? Number(data.vessel_id) : null, status: data.status || null, clientId: data.client_id, clientFilledAt: clientFilledAtParsed.value },
        update: {},
      });
      row = up;
      created = !existing;
    } else {
      row = await prisma.serviceOrder.create({ data: { employeeId: data.employee_id ? Number(data.employee_id) : null, osNumber, title: data.title || null, description: data.description, priority: data.priority || null, openedAt: openedAtParsed.value, approvalStatus: data.approval_status || null, vesselId: data.vessel_id ? Number(data.vessel_id) : null, status: data.status || null, clientFilledAt: clientFilledAtParsed.value } });
    }
    res.status(data.client_id ? 200 : created ? 201 : 200).json(mapServiceOrder(row));
  } catch (error) { handleServerError(res, error, 'service-orders-create'); }
});

export default router;
