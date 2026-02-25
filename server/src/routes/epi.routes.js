import express from 'express';
import { prisma } from '../prismaClient.js';
import { employeeParamsAuth, handleServerError, mapEpiCatalog, mapEpiDelivery, parseDateInputOrError, parseEmployeeIdParam, parseOptionalBoolean, parseOptionalInteger, requireAdminKeyIfConfigured, resolvePagination, shouldUsePaginatedResponse } from '../helpers.js';

const router = express.Router();

router.get('/api/epi/catalog', async (_req, res) => { try { const rows = await prisma.epiCatalog.findMany({ orderBy: { id: 'asc' } }); res.json(rows.map(mapEpiCatalog)); } catch (error) { handleServerError(res, error, 'epi-catalog-list'); } });
router.post('/api/epi/catalog', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const { name, code, ca, unit, stock_qty, min_stock, active } = req.body || {};
    if (!name) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'name é obrigatório' });
    const sq = parseOptionalInteger(stock_qty, 'stock_qty'); if (sq?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: sq.error });
    const ms = parseOptionalInteger(min_stock, 'min_stock'); if (ms?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: ms.error });
    const ac = parseOptionalBoolean(active, 'active'); if (ac?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: ac.error });
    const row = await prisma.epiCatalog.create({ data: { name, code, ca, unit, stockQty: sq ? sq.value : undefined, minStock: ms ? ms.value : undefined, active: ac ? ac.value : undefined } });
    res.status(201).json(mapEpiCatalog(row));
  } catch (error) { handleServerError(res, error, 'epi-catalog-create'); }
});

router.get('/api/epi/deliveries', async (req, res) => {
  try {
    if (!shouldUsePaginatedResponse(req.query)) {
      const rows = await prisma.epiDelivery.findMany({ orderBy: { id: 'asc' } });
      return res.json(rows.map(mapEpiDelivery));
    }

    const { page, pageSize } = resolvePagination(req.query);
    const total = await prisma.epiDelivery.count();
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const rows = await prisma.epiDelivery.findMany({
      orderBy: { id: 'asc' },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });

    return res.json({
      items: rows.map(mapEpiDelivery),
      page: safePage,
      pageSize,
      total,
      totalPages,
      hasMore: safePage < totalPages,
    });
  } catch (error) { handleServerError(res, error, 'epi-deliveries-list'); }
});
router.get('/api/employees/:id/epi-deliveries', ...employeeParamsAuth, async (req, res) => {
  try { const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return; const rows = await prisma.epiDelivery.findMany({ where: { employeeId }, orderBy: { id: 'asc' } }); res.json(rows.map(mapEpiDelivery)); }
  catch (error) { handleServerError(res, error, 'epi-deliveries-by-employee'); }
});
router.post('/api/epi/deliveries', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const { employee_id, epi_item_id, delivery_date, quantity, signature_url } = req.body || {};
    if (!employee_id || !epi_item_id) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'employee_id e epi_item_id são obrigatórios' });

    const deliveryDateParsed = parseDateInputOrError(delivery_date, 'delivery_date');
    if (deliveryDateParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: deliveryDateParsed.error });

    const row = await prisma.epiDelivery.create({ data: { employeeId: Number(employee_id), epiItemId: Number(epi_item_id), deliveryDate: deliveryDateParsed.value || undefined, quantity: quantity ? Number(quantity) : undefined, signatureUrl: signature_url || null } });
    res.status(201).json(mapEpiDelivery(row));
  } catch (error) { handleServerError(res, error, 'epi-deliveries-create'); }
});

export default router;
