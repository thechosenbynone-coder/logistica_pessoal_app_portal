import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { authOptional, guardEmployeeScope, requireEmployeeAuth, signEmployeeToken } from './src/auth.js';
import { registerIntegrationRoutes } from './src/integrationRoutes.js';
import { prisma } from './src/prismaClient.js';
import { computeEmployeeDocStatus, startOfTodayDateOnly } from './src/services/employeeDocStatus.js';

const app = express();
const port = process.env.PORT || 3001;

const normalizeOrigin = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/\/+$/, '').toLowerCase();
};

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

let didLogPermissiveCorsWarning = false;
const shouldLogAuthDebug = process.env.DEBUG_AUTH === 'true';

const corsOptions = {
  origin: (origin, callback) => {
    if (origin === undefined || origin === null) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);

    if (allowedOrigins.length === 0) {
      if (!didLogPermissiveCorsWarning) {
        console.warn('[CORS] CORS_ORIGINS não configurado. Rodando em modo permissivo temporário.');
        didLogPermissiveCorsWarning = true;
      }
      return callback(null, true);
    }

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    console.warn(
      `[CORS] blocked origin=${origin} normalized=${normalizedOrigin} allowed=${allowedOrigins.join(',')}`
    );
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ code: 'INVALID_JSON', message: 'JSON inválido no corpo da requisição.' });
  }
  return next(error);
});
app.use(authOptional);
registerIntegrationRoutes(app);

app.use((req, _res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

const handleServerError = (res, error, context) => {
  console.error(`[ERROR] ${context}:`, error?.stack || error);
  res.status(500).json({
    errorCode: 'INTERNAL_ERROR',
    message: `Erro interno em ${context}`,
  });
};

const normalizeCPF = (cpf) => String(cpf || '').replace(/\D/g, '');

const parseOptionalInteger = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return { error: `${fieldName} deve ser um número válido` };
  return { value: Math.trunc(parsed) };
};

const parseOptionalBoolean = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return { value };
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return { value: true };
    if (normalized === 'false') return { value: false };
  }
  return { error: `${fieldName} deve ser boolean (true/false)` };
};

const parseRequiredInteger = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return { error: `${fieldName} deve ser um inteiro positivo válido` };
  return { value: parsed };
};

const parseEmployeeIdParam = (req, res) => {
  const parsed = parseRequiredInteger(req.params.id, 'employeeId');
  if (parsed?.error) {
    res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'employeeId inválido' });
    return null;
  }
  return parsed.value;
};

const parseDateInput = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const raw = String(value).trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
    if (date.getUTCFullYear() === Number(y) && date.getUTCMonth() + 1 === Number(m) && date.getUTCDate() === Number(d)) {
      return date;
    }
    return null;
  }

  const brMatch = raw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    const date = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
    if (date.getUTCFullYear() === Number(y) && date.getUTCMonth() + 1 === Number(m) && date.getUTCDate() === Number(d)) {
      return date;
    }
    return null;
  }

  const isoDateTimeMatch = raw.match(/^\d{4}-\d{2}-\d{2}T/);
  if (isoDateTimeMatch) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
    return null;
  }

  return null;
};

const parseDateInputOrError = (value, fieldName, required = false) => {
  if ((value === undefined || value === null || value === '') && !required) return { value: null };
  const parsed = parseDateInput(value);
  if (!parsed) {
    return { error: `${fieldName} inválida, use dd/mm/aaaa ou yyyy-mm-dd` };
  }
  return { value: parsed };
};
const mapEmployee = (e) => ({
  id: e.id, name: e.name, cpf: e.cpf, role: e.role, email: e.email, phone: e.phone, base: e.base, created_at: e.createdAt,
});
const mapVessel = (v) => ({ id: v.id, name: v.name, type: v.type, client: v.client });
const mapDocumentType = (d) => ({ id: d.id, code: d.code, name: d.name, category: d.category, requires_expiration: d.requiresExpiration });
const mapDocument = (d) => ({
  id: d.id, employee_id: d.employeeId, document_type_id: d.documentTypeId, issue_date: d.issueDate,
  expiration_date: d.expirationDate, file_url: d.fileUrl, evidence_type: d.evidenceType, evidence_ref: d.evidenceRef,
  notes: d.notes, verified: d.verified, verified_by: d.verifiedBy, verified_at: d.verifiedAt,
  created_at: d.createdAt, updated_at: d.updatedAt,
  document_code: d.documentType?.code, document_name: d.documentType?.name,
});
const mapDeployment = (d) => ({
  id: d.id, employee_id: d.employeeId, vessel_id: d.vesselId, start_date: d.startDate,
  end_date_expected: d.endDateExpected, end_date_actual: d.endDateActual, notes: d.notes,
  created_at: d.createdAt, updated_at: d.updatedAt,
});
const mapEpiCatalog = (e) => ({
  id: e.id, name: e.name, code: e.code, ca: e.ca, unit: e.unit, stock_qty: e.stockQty,
  min_stock: e.minStock, active: e.active, created_at: e.createdAt, updated_at: e.updatedAt,
});
const mapEpiDelivery = (e) => ({
  id: e.id, employee_id: e.employeeId, epi_item_id: e.epiItemId, delivery_date: e.deliveryDate,
  quantity: e.quantity, signature_url: e.signatureUrl, created_at: e.createdAt, updated_at: e.updatedAt,
});
const mapDailyReport = (d) => ({
  id: d.id, employee_id: d.employeeId, report_date: d.reportDate, description: d.description, hours_worked: d.hoursWorked,
  approval_status: d.approvalStatus, approved_by: d.approvedBy, client_id: d.clientId, client_filled_at: d.clientFilledAt,
  created_at: d.createdAt, updated_at: d.updatedAt,
});
const mapServiceOrder = (s) => ({
  id: s.id, employee_id: s.employeeId, os_number: s.osNumber, title: s.title, description: s.description,
  priority: s.priority, opened_at: s.openedAt, approval_status: s.approvalStatus, vessel_id: s.vesselId,
  status: s.status, client_id: s.clientId, client_filled_at: s.clientFilledAt, created_at: s.createdAt, updated_at: s.updatedAt,
});
const mapFinancialRequest = (f) => ({
  id: f.id, employee_id: f.employeeId, type: f.type, amount: f.amount, description: f.description, status: f.status,
  client_id: f.clientId, client_filled_at: f.clientFilledAt, created_at: f.createdAt, updated_at: f.updatedAt,
});

const passthrough = (_req, _res, next) => next();
const shouldRequireEmployeeAuth = process.env.REQUIRE_EMPLOYEE_AUTH === 'true';
const employeeParamsAuth = shouldRequireEmployeeAuth ? [requireEmployeeAuth, guardEmployeeScope('params')] : [passthrough];
const employeeBodyAuth = shouldRequireEmployeeAuth ? [requireEmployeeAuth, guardEmployeeScope('body')] : [passthrough];

const requireAdminKeyIfConfigured = (req, res, next) => {
  if (!process.env.ADMIN_KEY) return next();
  const headerKey = req.header('x-admin-key');
  if (headerKey && headerKey === process.env.ADMIN_KEY) return next();
  return res.status(401).json({ errorCode: 'UNAUTHORIZED', message: 'x-admin-key inválido ou ausente' });
};

app.get(['/api/health', '/health'], async (_req, res) => {
  try {
    await prisma.$connect();
    await prisma.employee.findFirst({ select: { id: true } });
    res.json({ ok: true, status: 'ok', database: 'connected' });
  } catch (error) {
    handleServerError(res, error, 'health-check');
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const cpf = normalizeCPF(req.body?.cpf);
    const senha = String(req.body?.senha ?? req.body?.pin ?? '').trim();

    if (!cpf || !senha) {
      return res.status(400).json({ code: 'INVALID_PAYLOAD', message: 'Informe cpf e senha.' });
    }
    if (cpf.length !== 11) {
      return res.status(400).json({ code: 'INVALID_PAYLOAD', message: 'Informe cpf e senha.' });
    }

    const employee = await prisma.employee.findFirst({ where: { cpf } });
    if (!employee?.accessPinHash) {
      if (shouldLogAuthDebug) console.log('[AUTH_DEBUG]', { cpfReceived: req.body?.cpf, cpfNorm: cpf, reason: 'not_found_or_no_hash' });
      return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'CPF ou senha inválidos.' });
    }

    const isValid = await bcrypt.compare(senha, employee.accessPinHash);
    if (!isValid) {
      if (shouldLogAuthDebug) console.log('[AUTH_DEBUG]', { cpfReceived: req.body?.cpf, cpfNorm: cpf, reason: 'invalid_password' });
      return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'CPF ou senha inválidos.' });
    }

    const token = signEmployeeToken(employee.id);
    return res.json({ token, employee: mapEmployee(employee) });
  } catch (error) {
    handleServerError(res, error, 'auth-login');
  }
});

app.post('/api/admin/employees/:id/pin', async (req, res) => {
  try {
    if (req.auth?.role !== 'admin') return res.status(401).json({ errorCode: 'UNAUTHORIZED', message: 'Acesso admin obrigatório' });
    const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return;
    const pin = String(req.body?.pin || '').trim();
    if (!pin || pin.length < 4 || pin.length > 12 || !/^\d+$/.test(pin)) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'PIN inválido (use 4-12 dígitos)' });
    }
    const hash = await bcrypt.hash(pin, 10);
    const result = await prisma.employee.updateMany({ where: { id: employeeId }, data: { accessPinHash: hash, accessPinUpdatedAt: new Date() } });
    if (result.count === 0) return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'Colaborador não encontrado' });
    return res.json({ ok: true });
  } catch (error) { handleServerError(res, error, 'admin-set-pin'); }
});

app.get('/api/employees', async (req, res) => {
  try {
    const hasPageParams = ['page', 'pageSize', 'q'].some((key) =>
      Object.prototype.hasOwnProperty.call(req.query || {}, key)
    );
    const paginatedFlag = String(req.query?.paginated ?? '').toLowerCase() === 'true';

    if (!hasPageParams && !paginatedFlag) {
      const rows = await prisma.employee.findMany({ orderBy: { id: 'asc' } });
      return res.json(rows.map(mapEmployee));
    }

    const pageRaw = Number.parseInt(String(req.query?.page ?? '1'), 10);
    const pageSizeRaw = Number.parseInt(String(req.query?.pageSize ?? '25'), 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const pageSize = Math.min(100, Math.max(1, Number.isFinite(pageSizeRaw) ? pageSizeRaw : 25));
    const q = String(req.query?.q ?? '').trim();

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
app.get('/api/employees/:id', ...employeeParamsAuth, async (req, res) => {
  try { const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return; const e = await prisma.employee.findUnique({ where: { id: employeeId } }); if (!e) return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'Colaborador não encontrado' }); res.json(mapEmployee(e)); }
  catch (error) { handleServerError(res, error, 'employees-get-by-id'); }
});
app.post('/api/employees', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const data = { name: req.body?.name, cpf: req.body?.cpf, role: req.body?.role, email: req.body?.email, phone: req.body?.phone, base: req.body?.base };
    if (!data.name || !data.role || !data.cpf) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'name, role e cpf são obrigatórios' });
    data.cpf = normalizeCPF(data.cpf);
    const row = await prisma.employee.create({ data });
    res.status(201).json(mapEmployee(row));
  } catch (error) { handleServerError(res, error, 'employees-create'); }
});

app.get('/api/employees/:employeeId/notifications', requireEmployeeAuth, async (req, res) => {
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
app.post('/api/employees/:employeeId/notifications/read', requireEmployeeAuth, async (req, res) => {
  const employeeId = Number(req.params.employeeId);
  if (!Number.isInteger(employeeId) || employeeId <= 0) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'employeeId inválido' });
  if (req.auth?.role !== 'admin' && Number(req.auth?.employee_id) !== employeeId) return res.status(403).json({ errorCode: 'FORBIDDEN', message: 'Acesso fora do escopo do colaborador' });
  return res.json({ ok: true });
});

app.get('/api/dashboard/metrics', async (_req, res) => {
  try {
    const today = startOfTodayDateOnly();
    const in30 = new Date(today);
    in30.setUTCDate(in30.getUTCDate() + 30);

    const [
      employeesTotal,
      activeDeployments,
      dailyReportsPending,
      financialRequestsPending,
      documentsExpired,
      documentsExpiringDuringDeployment,
      documentsExpiringSoon,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.deployment.count({ where: { endDateActual: null } }),
      prisma.dailyReport.count({ where: { approvalStatus: 'Pendente' } }),
      prisma.financialRequest.count({ where: { status: { in: ['Solicitado', 'Aprovado'] } } }),
      prisma.employeeDocStatus.count({ where: { status: 'VENCIDO' } }),
      prisma.employeeDocStatus.count({ where: { status: 'VENCE_NO_EMBARQUE' } }),
      prisma.employeeDocStatus.count({ where: { expiresAt: { gte: today, lte: in30 } } }),
    ]);

    res.json({
      employeesTotal,
      activeDeployments,
      dailyReportsPending,
      financialRequestsPending,
      documentsExpired,
      documentsExpiringSoon,
      documentsExpiringDuringDeployment,
    });
  } catch (error) {
    handleServerError(res, error, 'dashboard-metrics');
  }
});


app.get('/api/vessels', async (_req, res) => { try { const rows = await prisma.vessel.findMany({ orderBy: { id: 'asc' } }); res.json(rows.map(mapVessel)); } catch (error) { handleServerError(res, error, 'vessels-list'); } });
app.post('/api/vessels', async (req, res) => {
  try { const { name, type, client } = req.body || {}; if (!name || !type) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'name e type são obrigatórios' }); const row = await prisma.vessel.create({ data: { name, type, client } }); res.status(201).json(mapVessel(row)); }
  catch (error) { handleServerError(res, error, 'vessels-create'); }
});

app.get('/api/document-types', async (_req, res) => { try { const rows = await prisma.documentType.findMany({ orderBy: { id: 'asc' } }); res.json(rows.map(mapDocumentType)); } catch (error) { handleServerError(res, error, 'document-types-list'); } });
app.post('/api/document-types', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const { code, name, category, requires_expiration } = req.body || {};
    if (!code || !name) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'code e name são obrigatórios' });
    const parsedRequiresExpiration = parseOptionalBoolean(requires_expiration, 'requires_expiration');
    if (parsedRequiresExpiration?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: parsedRequiresExpiration.error });
    const row = await prisma.documentType.create({ data: { code, name, category, requiresExpiration: parsedRequiresExpiration ? parsedRequiresExpiration.value : undefined } });
    res.status(201).json(mapDocumentType(row));
  } catch (error) { handleServerError(res, error, 'document-types-create'); }
});

app.get('/api/documents', async (_req, res) => { try { const rows = await prisma.document.findMany({ include: { documentType: true }, orderBy: { id: 'asc' } }); res.json(rows.map(mapDocument)); } catch (error) { handleServerError(res, error, 'documents-list'); } });
app.get('/api/employees/:id/documents', ...employeeParamsAuth, async (req, res) => {
  try { const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return; const rows = await prisma.document.findMany({ where: { employeeId }, include: { documentType: true }, orderBy: { id: 'asc' } }); res.json(rows.map(mapDocument)); }
  catch (error) { handleServerError(res, error, 'documents-by-employee'); }
});
app.post('/api/documents', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.employee_id || !data.document_type_id || !data.issue_date) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'employee_id, document_type_id, issue_date são obrigatórios' });
    const employeeIdParsed = parseRequiredInteger(data.employee_id, 'employee_id'); if (employeeIdParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: employeeIdParsed.error });
    const documentTypeIdParsed = parseRequiredInteger(data.document_type_id, 'document_type_id'); if (documentTypeIdParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: documentTypeIdParsed.error });
    const issueDateParsed = parseDateInputOrError(data.issue_date, 'issue_date', true);
    if (issueDateParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: issueDateParsed.error });

    const expirationDateParsed = parseDateInputOrError(data.expiration_date, 'expiration_date');
    if (expirationDateParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: expirationDateParsed.error });

    const verifiedAtParsed = parseDateInputOrError(data.verified_at, 'verified_at');
    if (verifiedAtParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: verifiedAtParsed.error });

    const documentType = await prisma.documentType.findUnique({ where: { id: documentTypeIdParsed.value } });
    if (!documentType) return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'Tipo de documento não encontrado' });
    if (documentType.requiresExpiration && !data.expiration_date) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'expiration_date é obrigatório para este tipo de documento' });

    const parsedVerified = parseOptionalBoolean(data.verified, 'verified');
    if (parsedVerified?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: parsedVerified.error });

    const row = await prisma.document.upsert({
      where: { employeeId_documentTypeId: { employeeId: employeeIdParsed.value, documentTypeId: documentTypeIdParsed.value } },
      create: {
        employeeId: employeeIdParsed.value,
        documentTypeId: documentTypeIdParsed.value,
        issueDate: issueDateParsed.value,
        expirationDate: documentType.requiresExpiration ? expirationDateParsed.value : null,
        fileUrl: data.file_url || null,
        evidenceType: data.evidence_type || null,
        evidenceRef: data.evidence_ref || null,
        notes: data.notes || null,
        verified: parsedVerified ? parsedVerified.value : false,
        verifiedBy: data.verified_by || null,
        verifiedAt: verifiedAtParsed.value || (parsedVerified?.value ? new Date() : null),
      },
      update: {
        issueDate: issueDateParsed.value,
        expirationDate: documentType.requiresExpiration ? expirationDateParsed.value : null,
        fileUrl: data.file_url || null,
        evidenceType: data.evidence_type || null,
        evidenceRef: data.evidence_ref || null,
        notes: data.notes || null,
        verified: parsedVerified ? parsedVerified.value : false,
        verifiedBy: data.verified_by || null,
        verifiedAt: verifiedAtParsed.value || (parsedVerified?.value ? new Date() : null),
      },
      include: { documentType: true },
    });

    await computeEmployeeDocStatus(employeeIdParsed.value);
    res.status(201).json(mapDocument(row));
  } catch (error) { handleServerError(res, error, 'documents-create'); }
});

app.get('/api/deployments', async (_req, res) => { try { const rows = await prisma.deployment.findMany({ orderBy: { id: 'asc' } }); res.json(rows.map(mapDeployment)); } catch (error) { handleServerError(res, error, 'deployments-list'); } });
app.get('/api/employees/:id/deployments', ...employeeParamsAuth, async (req, res) => {
  try { const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return; const rows = await prisma.deployment.findMany({ where: { employeeId }, orderBy: { id: 'asc' } }); res.json(rows.map(mapDeployment)); }
  catch (error) { handleServerError(res, error, 'deployments-by-employee'); }
});
app.post('/api/deployments', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.employee_id || !data.start_date || !data.end_date_expected) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'employee_id, start_date, end_date_expected são obrigatórios' });
    const startDateParsed = parseDateInputOrError(data.start_date, 'start_date', true);
    if (startDateParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: startDateParsed.error });
    const endDateExpectedParsed = parseDateInputOrError(data.end_date_expected, 'end_date_expected', true);
    if (endDateExpectedParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: endDateExpectedParsed.error });
    const endDateActualParsed = parseDateInputOrError(data.end_date_actual, 'end_date_actual');
    if (endDateActualParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: endDateActualParsed.error });

    const row = await prisma.deployment.create({ data: { employeeId: Number(data.employee_id), vesselId: data.vessel_id ? Number(data.vessel_id) : null, startDate: startDateParsed.value, endDateExpected: endDateExpectedParsed.value, endDateActual: endDateActualParsed.value, notes: data.notes || null } });
    await computeEmployeeDocStatus(Number(data.employee_id));
    res.status(201).json(mapDeployment(row));
  } catch (error) { handleServerError(res, error, 'deployments-create'); }
});

app.get('/api/epi/catalog', async (_req, res) => { try { const rows = await prisma.epiCatalog.findMany({ orderBy: { id: 'asc' } }); res.json(rows.map(mapEpiCatalog)); } catch (error) { handleServerError(res, error, 'epi-catalog-list'); } });
app.post('/api/epi/catalog', requireAdminKeyIfConfigured, async (req, res) => {
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

app.get('/api/epi/deliveries', async (_req, res) => { try { const rows = await prisma.epiDelivery.findMany({ orderBy: { id: 'asc' } }); res.json(rows.map(mapEpiDelivery)); } catch (error) { handleServerError(res, error, 'epi-deliveries-list'); } });
app.get('/api/employees/:id/epi-deliveries', ...employeeParamsAuth, async (req, res) => {
  try { const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return; const rows = await prisma.epiDelivery.findMany({ where: { employeeId }, orderBy: { id: 'asc' } }); res.json(rows.map(mapEpiDelivery)); }
  catch (error) { handleServerError(res, error, 'epi-deliveries-by-employee'); }
});
app.post('/api/epi/deliveries', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const { employee_id, epi_item_id, delivery_date, quantity, signature_url } = req.body || {};
    if (!employee_id || !epi_item_id) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'employee_id e epi_item_id são obrigatórios' });

    const deliveryDateParsed = parseDateInputOrError(delivery_date, 'delivery_date');
    if (deliveryDateParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: deliveryDateParsed.error });

    const row = await prisma.epiDelivery.create({ data: { employeeId: Number(employee_id), epiItemId: Number(epi_item_id), deliveryDate: deliveryDateParsed.value || undefined, quantity: quantity ? Number(quantity) : undefined, signatureUrl: signature_url || null } });
    res.status(201).json(mapEpiDelivery(row));
  } catch (error) { handleServerError(res, error, 'epi-deliveries-create'); }
});

app.get('/api/daily-reports', async (_req, res) => { try { const rows = await prisma.dailyReport.findMany({ orderBy: { id: 'asc' } }); res.json(rows.map(mapDailyReport)); } catch (error) { handleServerError(res, error, 'daily-reports-list'); } });
app.get('/api/employees/:id/daily-reports', ...employeeParamsAuth, async (req, res) => {
  try { const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return; const rows = await prisma.dailyReport.findMany({ where: { employeeId }, orderBy: { id: 'desc' } }); res.json(rows.map(mapDailyReport)); }
  catch (error) { handleServerError(res, error, 'daily-reports-by-employee'); }
});
app.post('/api/daily-reports', ...employeeBodyAuth, async (req, res) => {
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

app.get('/api/service-orders', async (_req, res) => { try { const rows = await prisma.serviceOrder.findMany({ orderBy: { id: 'asc' } }); res.json(rows.map(mapServiceOrder)); } catch (error) { handleServerError(res, error, 'service-orders-list'); } });
app.get('/api/employees/:id/service-orders', ...employeeParamsAuth, async (req, res) => {
  try { const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return; const rows = await prisma.serviceOrder.findMany({ where: { employeeId }, orderBy: { id: 'desc' } }); res.json(rows.map(mapServiceOrder)); }
  catch (error) { handleServerError(res, error, 'service-orders-by-employee'); }
});
app.post('/api/service-orders', ...employeeBodyAuth, async (req, res) => {
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

app.get('/api/financial-requests', async (req, res) => {
  try { const where = req.query.type ? { type: String(req.query.type) } : undefined; const rows = await prisma.financialRequest.findMany({ where, orderBy: { id: 'asc' } }); res.json(rows.map(mapFinancialRequest)); }
  catch (error) { handleServerError(res, error, 'financial-requests-list'); }
});
app.get('/api/employees/:id/financial-requests', ...employeeParamsAuth, async (req, res) => {
  try { const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return; const rows = await prisma.financialRequest.findMany({ where: { employeeId }, orderBy: { id: 'desc' } }); res.json(rows.map(mapFinancialRequest)); }
  catch (error) { handleServerError(res, error, 'financial-requests-by-employee'); }
});
app.post('/api/financial-requests', ...employeeBodyAuth, async (req, res) => {
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

app.get('/api/employees/:id/doc-status', ...employeeParamsAuth, async (req, res) => {
  try {
    const employeeId = parseEmployeeIdParam(req, res);
    if (!employeeId) return;
    await computeEmployeeDocStatus(employeeId);
    const rows = await prisma.employeeDocStatus.findMany({ where: { employeeId }, orderBy: { docType: 'asc' } });
    res.json(rows.map((r) => ({ id: r.id, employee_id: r.employeeId, doc_type: r.docType, status: r.status, expires_at: r.expiresAt, computed_at: r.computedAt, vence_durante_embarque: r.venceDuranteEmbarque, risco_reembarque: r.riscoReembarque })));
  } catch (error) { handleServerError(res, error, 'employee-doc-status'); }
});

app.get('/api/profile', async (req, res) => {
  const employeeId = Number(req.auth?.employee_id);
  if (Number.isInteger(employeeId) && employeeId > 0) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    return res.json(employee ? mapEmployee(employee) : {});
  }
  return res.json({});
});


app.get('/api/checkins', (_req, res) => res.json([]));
app.post('/api/checkins', ...employeeBodyAuth, (_req, res) => res.status(201).json({ ok: true }));

app.get('/', (_req, res) => res.send('API Logística Offshore - Online 🚀'));

const bootstrap = async () => {
  await prisma.$connect();
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 API rodando em http://localhost:${port}`);
  });
};

bootstrap().catch((error) => {
  console.error('[BOOT] erro fatal ao iniciar API:', error?.stack || error);
  process.exit(1);
});
