import { guardEmployeeScope, requireEmployeeAuth } from './auth.js';

export const handleServerError = (res, error, context) => {
  console.error(`[ERROR] ${context}:`, error?.stack || error);
  res.status(500).json({
    errorCode: 'INTERNAL_ERROR',
    message: `Erro interno em ${context}`,
  });
};

export const normalizeCPF = (cpf) => String(cpf || '').replace(/\D/g, '');

export const parseOptionalInteger = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return { error: `${fieldName} deve ser um número válido` };
  return { value: Math.trunc(parsed) };
};

export const parseOptionalBoolean = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return { value };
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return { value: true };
    if (normalized === 'false') return { value: false };
  }
  return { error: `${fieldName} deve ser boolean (true/false)` };
};

export const parseEmployeeIdParam = (req, res) => {
  const parsed = parseRequiredInteger(req.params.id, 'employeeId');
  if (parsed?.error) {
    res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'employeeId inválido' });
    return null;
  }
  return parsed.value;
};

export const parseDateInput = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const raw = String(value).trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
    if (
      date.getUTCFullYear() === Number(y) &&
      date.getUTCMonth() + 1 === Number(m) &&
      date.getUTCDate() === Number(d)
    ) {
      return date;
    }
    return null;
  }

  const brMatch = raw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    const date = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
    if (
      date.getUTCFullYear() === Number(y) &&
      date.getUTCMonth() + 1 === Number(m) &&
      date.getUTCDate() === Number(d)
    ) {
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

export const parseDateInputOrError = (value, fieldName, required = false) => {
  if ((value === undefined || value === null || value === '') && !required) return { value: null };
  const parsed = parseDateInput(value);
  if (!parsed) {
    return { error: `${fieldName} inválida, use dd/mm/aaaa ou yyyy-mm-dd` };
  }
  return { value: parsed };
};

export const shouldUsePaginatedResponse = (query) => {
  const hasPageParams = ['page', 'pageSize', 'q'].some((key) =>
    Object.prototype.hasOwnProperty.call(query || {}, key)
  );
  const paginatedFlag = String(query?.paginated ?? '').toLowerCase() === 'true';
  return hasPageParams || paginatedFlag;
};

export const resolvePagination = (query, defaultPageSize = 25) => {
  const pageRaw = Number.parseInt(String(query?.page ?? '1'), 10);
  const pageSizeRaw = Number.parseInt(String(query?.pageSize ?? String(defaultPageSize)), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const pageSize = Math.min(
    100,
    Math.max(1, Number.isFinite(pageSizeRaw) ? pageSizeRaw : defaultPageSize)
  );
  const q = String(query?.q ?? '').trim();
  return { page, pageSize, q };
};

export const mapEmployee = (e) => ({
  id: e.id,
  name: e.name,
  cpf: e.cpf,
  role: e.role,
  email: e.email,
  phone: e.phone,
  base: e.base,
  current_status: e.currentStatus,
  status_updated_at: e.statusUpdatedAt,
  post_disembark_plan: e.postDisembarkPlan,
  folga_return_date: e.folgaReturnDate,
  created_at: e.createdAt,
});
export const mapVessel = (v) => ({ id: v.id, name: v.name, type: v.type, client: v.client });
export const mapDocumentType = (d) => ({
  id: d.id,
  code: d.code,
  name: d.name,
  category: d.category,
  requires_expiration: d.requiresExpiration,
});
export const mapDocument = (d) => ({
  id: d.id,
  employee_id: d.employeeId,
  document_type_id: d.documentTypeId,
  issue_date: d.issueDate,
  expiration_date: d.expirationDate,
  file_url: d.fileUrl,
  evidence_type: d.evidenceType,
  evidence_ref: d.evidenceRef,
  notes: d.notes,
  verified: d.verified,
  verified_by: d.verifiedBy,
  verified_at: d.verifiedAt,
  created_at: d.createdAt,
  updated_at: d.updatedAt,
  document_code: d.documentType?.code,
  document_name: d.documentType?.name,
});

export const mapDeploymentMember = (m) => ({
  id: m.id,
  deployment_id: m.deploymentId,
  employee_id: m.employeeId,
  gate_status: m.gateStatus,
  gate_notes: m.gateNotes,
  added_at: m.addedAt,
  employee: m.employee ? mapEmployee(m.employee) : undefined,
});

export const mapTool = (t) => ({
  id: t.id,
  name: t.name,
  code: t.code,
  type: t.type,
  notes: t.notes,
  active: t.active,
  created_at: t.createdAt,
  updated_at: t.updatedAt,
});

export const mapToolAssignment = (a) => ({
  id: a.id,
  tool_id: a.toolId,
  deployment_id: a.deploymentId,
  employee_id: a.employeeId,
  status: a.status,
  assigned_at: a.assignedAt,
  returned_at: a.returnedAt,
  notes: a.notes,
  tool: a.tool ? mapTool(a.tool) : undefined,
  employee: a.employee ? mapEmployee(a.employee) : undefined,
});

export const mapAccommodation = (a) => ({
  id: a.id,
  deployment_id: a.deploymentId,
  employee_id: a.employeeId,
  type: a.type,
  provider_name: a.providerName,
  check_in: a.checkIn,
  check_out: a.checkOut,
  address: a.address,
  confirmation_code: a.confirmationCode,
  notes: a.notes,
  status: a.status,
  created_at: a.createdAt,
  updated_at: a.updatedAt,
  employee: a.employee ? mapEmployee(a.employee) : undefined,
});

export const mapDeploymentTicket = (t) => ({
  id: t.id,
  deployment_id: t.deploymentId,
  type: t.type,
  provider: t.provider,
  locator: t.locator,
  departure: t.departure,
  arrival: t.arrival,
  origin: t.origin,
  destination: t.destination,
  file_url: t.fileUrl,
  notes: t.notes,
  created_at: t.createdAt,
});

export const mapDeployment = (d) => ({
  id: d.id,
  employee_id: d.employeeId,
  vessel_id: d.vesselId,
  start_date: d.startDate,
  end_date_expected: d.endDateExpected,
  end_date_actual: d.endDateActual,
  notes: d.notes,
  status: d.status,
  transport_type: d.transportType,
  departure_hub: d.departureHub,
  service_type: d.serviceType,
  members: Array.isArray(d.members) ? d.members.map(mapDeploymentMember) : undefined,
  employee: d.employee ? mapEmployee(d.employee) : undefined,
  vessel: d.vessel ? mapVessel(d.vessel) : undefined,
  created_at: d.createdAt,
  updated_at: d.updatedAt,
});
export const mapEpiCatalog = (e) => ({
  id: e.id,
  name: e.name,
  code: e.code,
  ca: e.ca,
  unit: e.unit,
  stock_qty: e.stockQty,
  min_stock: e.minStock,
  active: e.active,
  created_at: e.createdAt,
  updated_at: e.updatedAt,
});
export const mapEpiDelivery = (e) => ({
  id: e.id,
  employee_id: e.employeeId,
  epi_item_id: e.epiItemId,
  delivery_date: e.deliveryDate,
  quantity: e.quantity,
  signature_url: e.signatureUrl,
  status: e.status,
  location: e.location,
  responsible: e.responsible,
  notes: e.notes,
  returned_at: e.returnedAt,
  returned_qty: e.returnedQty,
  returned_notes: e.returnedNotes,
  created_at: e.createdAt,
  updated_at: e.updatedAt,
  employee: e.employee ? mapEmployee(e.employee) : undefined,
  epi_item: e.epiItem ? mapEpiCatalog(e.epiItem) : undefined,
});
export const mapDailyReport = (d) => ({
  id: d.id,
  employee_id: d.employeeId,
  report_date: d.reportDate,
  description: d.description,
  hours_worked: d.hoursWorked,
  approval_status: d.approvalStatus,
  approved_by: d.approvedBy,
  reviewed_by: d.reviewedBy,
  reviewed_at: d.reviewedAt,
  rejection_reason: d.rejectionReason,
  client_id: d.clientId,
  client_filled_at: d.clientFilledAt,
  deployment_id: d.deploymentId,
  deployment: d.deployment
    ? {
        id: d.deployment.id,
        service_type: d.deployment.serviceType,
        vessel: d.deployment.vessel ? mapVessel(d.deployment.vessel) : undefined,
      }
    : undefined,
  employee: d.employee ? mapEmployee(d.employee) : undefined,
  created_at: d.createdAt,
  updated_at: d.updatedAt,
});
export const mapServiceOrder = (s) => ({
  id: s.id,
  employee_id: s.employeeId,
  os_number: s.osNumber,
  title: s.title,
  description: s.description,
  priority: s.priority,
  opened_at: s.openedAt,
  approval_status: s.approvalStatus,
  vessel_id: s.vesselId,
  reviewed_by: s.reviewedBy,
  reviewed_at: s.reviewedAt,
  rejection_reason: s.rejectionReason,
  status: s.status,
  client_id: s.clientId,
  client_filled_at: s.clientFilledAt,
  deployment_id: s.deploymentId,
  deployment: s.deployment
    ? {
        id: s.deployment.id,
        service_type: s.deployment.serviceType,
        vessel: s.deployment.vessel ? mapVessel(s.deployment.vessel) : undefined,
      }
    : undefined,
  employee: s.employee ? mapEmployee(s.employee) : undefined,
  vessel: s.vessel ? mapVessel(s.vessel) : undefined,
  created_at: s.createdAt,
  updated_at: s.updatedAt,
});
export const mapFinancialRequest = (f) => ({
  id: f.id,
  employee_id: f.employeeId,
  type: f.type,
  category: f.category,
  amount: f.amount,
  description: f.description,
  status: f.status,
  deployment_id: f.deploymentId,
  deployment: f.deployment
    ? {
        id: f.deployment.id,
        service_type: f.deployment.serviceType,
        vessel: f.deployment.vessel ? mapVessel(f.deployment.vessel) : undefined,
      }
    : undefined,
  payment_due_date: f.paymentDueDate,
  reviewed_by: f.reviewedBy,
  reviewed_at: f.reviewedAt,
  rejection_reason: f.rejectionReason,
  client_id: f.clientId,
  client_filled_at: f.clientFilledAt,
  employee: f.employee ? mapEmployee(f.employee) : undefined,
  created_at: f.createdAt,
  updated_at: f.updatedAt,
});

export const passthrough = (_req, _res, next) => next();
export const shouldRequireEmployeeAuth = process.env.REQUIRE_EMPLOYEE_AUTH === 'true';
export const employeeParamsAuth = shouldRequireEmployeeAuth
  ? [requireEmployeeAuth, guardEmployeeScope('params')]
  : [passthrough];
export const employeeBodyAuth = shouldRequireEmployeeAuth
  ? [requireEmployeeAuth, guardEmployeeScope('body')]
  : [passthrough];

export const requireAdminKeyIfConfigured = (req, res, next) => {
  if (!process.env.ADMIN_KEY) return next();
  const headerKey = req.header('x-admin-key');
  if (headerKey && headerKey === process.env.ADMIN_KEY) return next();
  return res
    .status(401)
    .json({ errorCode: 'UNAUTHORIZED', message: 'x-admin-key inválido ou ausente' });
};

export const startOfTodayDateOnly = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

export const parseRequiredInteger = (value, fieldName) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return { error: `${fieldName} deve ser um inteiro válido` };
  }
  return { value: parsed };
};
