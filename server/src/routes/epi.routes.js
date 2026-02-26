import express from 'express';
import { prisma } from '../prismaClient.js';
import { employeeParamsAuth, handleServerError, mapEpiCatalog, mapEpiDelivery, parseDateInputOrError, parseEmployeeIdParam, parseOptionalBoolean, parseOptionalInteger, parseRequiredInteger, requireAdminKeyIfConfigured, resolvePagination, shouldUsePaginatedResponse } from '../helpers.js';

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
    const rows = await prisma.epiDelivery.findMany({ orderBy: { id: 'asc' }, skip: (safePage - 1) * pageSize, take: pageSize });

    return res.json({ items: rows.map(mapEpiDelivery), page: safePage, pageSize, total, totalPages, hasMore: safePage < totalPages });
  } catch (error) { handleServerError(res, error, 'epi-deliveries-list'); }
});
router.get('/api/employees/:id/epi-deliveries', ...employeeParamsAuth, async (req, res) => {
  try { const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return; const rows = await prisma.epiDelivery.findMany({ where: { employeeId }, orderBy: { id: 'asc' } }); res.json(rows.map(mapEpiDelivery)); }
  catch (error) { handleServerError(res, error, 'epi-deliveries-by-employee'); }
});
router.post('/api/epi/deliveries', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const { employee_id, epi_item_id, delivery_date, quantity, signature_url, location, responsible, notes } = req.body || {};
    const employeeId = parseRequiredInteger(employee_id, 'employee_id');
    const epiItemId = parseRequiredInteger(epi_item_id, 'epi_item_id');
    const qty = parseRequiredInteger(quantity, 'quantity');
    if (employeeId?.error || epiItemId?.error || qty?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: employeeId?.error || epiItemId?.error || qty?.error });

    if (qty.value <= 0) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'quantity deve ser maior que zero' });

    const deliveryDateParsed = parseDateInputOrError(delivery_date, 'delivery_date');
    if (deliveryDateParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: deliveryDateParsed.error });

    const epiItem = await prisma.epiCatalog.findUnique({ where: { id: epiItemId.value } });
    if (!epiItem) return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'EPI não encontrado' });
    if (epiItem.stockQty < qty.value) return res.status(400).json({ errorCode: 'INSUFFICIENT_STOCK', message: 'Estoque insuficiente para entrega' });

    const [row] = await prisma.$transaction([
      prisma.epiDelivery.create({ data: { employeeId: employeeId.value, epiItemId: epiItemId.value, deliveryDate: deliveryDateParsed.value || undefined, quantity: qty.value, signatureUrl: signature_url || null, location: location || null, responsible: responsible || null, notes: notes || null } }),
      prisma.epiCatalog.update({ where: { id: epiItemId.value }, data: { stockQty: { decrement: qty.value } } }),
    ]);
    res.status(201).json(mapEpiDelivery(row));
  } catch (error) { handleServerError(res, error, 'epi-deliveries-create'); }
});

router.patch('/api/epi/deliveries/:id/return', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const id = parseRequiredInteger(req.params.id, 'id');
    const returnedQty = parseRequiredInteger(req.body?.returned_qty, 'returned_qty');
    if (id?.error || returnedQty?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: id?.error || returnedQty?.error });

    const delivery = await prisma.epiDelivery.findUnique({ where: { id: id.value } });
    if (!delivery) return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'Entrega não encontrada' });

    const creditQty = Math.min(returnedQty.value, delivery.quantity);
    const newStatus = returnedQty.value >= delivery.quantity ? 'DEVOLVIDO' : 'PARCIAL';

    const [updated] = await prisma.$transaction([
      prisma.epiDelivery.update({ where: { id: id.value }, data: { returnedAt: new Date(), returnedQty: returnedQty.value, returnedNotes: req.body?.returned_notes || null, status: newStatus } }),
      prisma.epiCatalog.update({ where: { id: delivery.epiItemId }, data: { stockQty: { increment: creditQty } } }),
    ]);

    return res.json(mapEpiDelivery(updated));
  } catch (error) { handleServerError(res, error, 'epi-delivery-return'); }
});

router.patch('/api/epi/deliveries/:id/status', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const id = parseRequiredInteger(req.params.id, 'id');
    if (id?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: id.error });
    const allowed = ['ASSINADO', 'AGUARDANDO_ASSINATURA'];
    if (!allowed.includes(req.body?.status)) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'status inválido' });
    const updated = await prisma.epiDelivery.update({ where: { id: id.value }, data: { status: req.body.status } });
    res.json(mapEpiDelivery(updated));
  } catch (error) { handleServerError(res, error, 'epi-delivery-status'); }
});

router.get('/api/employees/:id/epi-ficha', ...employeeParamsAuth, async (req, res) => {
  try {
    const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return;
    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true, name: true, role: true } });
    if (!employee) return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'Colaborador não encontrado' });

    const [deliveries, requirements] = await Promise.all([
      prisma.epiDelivery.findMany({ where: { employeeId }, include: { epiItem: true }, orderBy: { id: 'desc' } }),
      prisma.epiFunctionRequirement.findMany({ where: { role: employee.role || '' }, include: { epiItem: true }, orderBy: { id: 'asc' } }),
    ]);

    res.json({
      employee,
      deliveries: deliveries.map(mapEpiDelivery),
      requirements: requirements.map((r) => ({ id: r.id, role: r.role, qty: r.qty, mandatory: r.mandatory, epi_item: mapEpiCatalog(r.epiItem) })),
    });
  } catch (error) { handleServerError(res, error, 'epi-ficha'); }
});

router.get('/api/epi/pendencias', async (_req, res) => {
  try {
    const deliveries = await prisma.epiDelivery.findMany({
      where: { status: { not: 'DEVOLVIDO' } },
      include: { employee: true, epiItem: true },
      orderBy: [{ deliveryDate: 'asc' }, { id: 'asc' }],
    });
    const filtered = deliveries.filter((d) => d.status === 'AGUARDANDO_ASSINATURA' || d.returnedQty == null || d.returnedQty < d.quantity);
    const employeeIds = [...new Set(filtered.map((d) => d.employeeId))];
    const deployments = await prisma.deployment.findMany({ where: { employeeId: { in: employeeIds } }, select: { id: true, employeeId: true, endDateExpected: true, startDate: true }, orderBy: [{ endDateExpected: 'asc' }, { startDate: 'asc' }] });
    const nextByEmployee = new Map();
    for (const dep of deployments) if (!nextByEmployee.has(dep.employeeId)) nextByEmployee.set(dep.employeeId, dep);
    const enriched = filtered.map((d) => ({ ...mapEpiDelivery(d), next_deployment: nextByEmployee.get(d.employeeId) || null }));
    enriched.sort((a, b) => {
      const da = a.next_deployment?.endDateExpected || a.next_deployment?.startDate || a.delivery_date;
      const db = b.next_deployment?.endDateExpected || b.next_deployment?.startDate || b.delivery_date;
      return new Date(da || 0).getTime() - new Date(db || 0).getTime();
    });
    res.json(enriched);
  } catch (error) { handleServerError(res, error, 'epi-pendencias'); }
});

router.get('/api/epi/function-requirements', async (_req, res) => {
  try {
    const rows = await prisma.epiFunctionRequirement.findMany({ include: { epiItem: true }, orderBy: [{ role: 'asc' }, { id: 'asc' }] });
    res.json(rows.map((r) => ({ id: r.id, role: r.role, epi_item_id: r.epiItemId, qty: r.qty, mandatory: r.mandatory, epi_item: mapEpiCatalog(r.epiItem) })));
  } catch (error) { handleServerError(res, error, 'epi-function-requirements-list'); }
});

router.post('/api/epi/function-requirements', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const qty = parseRequiredInteger(req.body?.qty ?? 1, 'qty');
    const epiItemId = parseRequiredInteger(req.body?.epi_item_id, 'epi_item_id');
    const role = String(req.body?.role || '').trim();
    if (!role || qty?.error || epiItemId?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: role ? qty?.error || epiItemId?.error : 'role é obrigatório' });
    const row = await prisma.epiFunctionRequirement.create({ data: { role, epiItemId: epiItemId.value, qty: qty.value, mandatory: req.body?.mandatory !== false }, include: { epiItem: true } });
    res.status(201).json({ id: row.id, role: row.role, epi_item_id: row.epiItemId, qty: row.qty, mandatory: row.mandatory, epi_item: mapEpiCatalog(row.epiItem) });
  } catch (error) { handleServerError(res, error, 'epi-function-requirements-create'); }
});

router.delete('/api/epi/function-requirements/:id', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const id = parseRequiredInteger(req.params.id, 'id');
    if (id?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: id.error });
    await prisma.epiFunctionRequirement.delete({ where: { id: id.value } });
    res.status(204).send();
  } catch (error) { handleServerError(res, error, 'epi-function-requirements-delete'); }
});

export default router;
