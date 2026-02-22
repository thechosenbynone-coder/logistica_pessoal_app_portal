import express from 'express';
import cors from 'cors';
import pg from 'pg';
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { authOptional, guardEmployeeScope, requireEmployeeAuth, signEmployeeToken } from './src/auth.js';
import { registerIntegrationRoutes } from './src/integrationRoutes.js';

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 3001;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const normalizeOrigin = (origin) => {
  if (typeof origin !== 'string') return origin;
  return origin.trim().replace(/\/+$/, '').toLowerCase();
};

const configuredCorsOrigins = [
  ...new Set(
    `${process.env.CORS_ORIGINS || ''},${process.env.CORS_ORIGIN || ''}`
      .split(',')
      .map((item) => normalizeOrigin(item))
      .filter(Boolean)
  ),
];

const allowVercelOrigins = process.env.CORS_ALLOW_VERCEL === 'true';
const allowNullOrigin = process.env.CORS_ALLOW_NULL_ORIGIN === 'true';
const isProduction = process.env.NODE_ENV === 'production';

const isAllowedOrigin = (origin) => {
  if (origin === undefined) {
    // server-to-server / same-origin requests sem header Origin
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);

  if (configuredCorsOrigins.includes('*')) {
    return true;
  }

  if (
    normalizedOrigin === null ||
    normalizedOrigin === '' ||
    normalizedOrigin === 'null'
  ) {
    return allowNullOrigin;
  }

  if (
    normalizedOrigin === 'capacitor://localhost' ||
    normalizedOrigin === 'ionic://localhost'
  ) {
    return true;
  }

  if (!isProduction) {
    if (
      normalizedOrigin.startsWith('http://localhost:') ||
      normalizedOrigin.startsWith('http://127.0.0.1:')
    ) {
      return true;
    }
  }

  if (configuredCorsOrigins.includes(normalizedOrigin)) {
    return true;
  }

  if (allowVercelOrigins) {
    try {
      const hostname = new URL(normalizedOrigin).hostname;
      if (hostname.endsWith('.vercel.app')) return true;
    } catch (_error) {
      return false;
    }
  }

  return false;
};

const corsOptions = {
  origin: (origin, cb) => {
    if (isAllowedOrigin(origin)) return cb(null, true);

    const normalizedOrigin = normalizeOrigin(origin);
    console.error('[CORS] bloqueado', {
      origin,
      normalizedOrigin,
      configuredCorsOrigins,
      allowVercelOrigins,
      allowNullOrigin,
      nodeEnv: process.env.NODE_ENV,
    });

    return cb(new Error('Origem não permitida por CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
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

const pickData = (body, allowedKeys) => {
  const out = {};
  for (const k of allowedKeys) {
    if (body && Object.prototype.hasOwnProperty.call(body, k) && body[k] !== undefined)
      out[k] = body[k];
  }
  return out;
};

const createInsertQuery = (table, data) => {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const cols = keys.map((k) => `"${k}"`).join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  return { text: `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`, values };
};



const createInsertOnConflictClientIdQuery = (table, data) => {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const cols = keys.map((k) => `"${k}"`).join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  return {
    text: `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT (client_id) DO NOTHING RETURNING *`,
    values,
  };
};

const insertIdempotentByClientId = async (table, data) => {
  if (data.client_id) {
    try {
      const insertResult = await pool.query(createInsertOnConflictClientIdQuery(table, data));
      if (insertResult.rows[0]) {
        return { row: insertResult.rows[0], created: true };
      }

      const existingResult = await pool.query(
        `SELECT * FROM ${table} WHERE client_id = $1 ORDER BY id DESC LIMIT 1`,
        [data.client_id]
      );
      if (existingResult.rows[0]) {
        return { row: existingResult.rows[0], created: false };
      }
    } catch (error) {
      if (error?.code === '42P01') {
        const schemaError = new Error(`Tabela ausente para idempotência: ${table}`);
        schemaError.code = 'TABLE_MISSING';
        throw schemaError;
      }

      if (error?.code === '42703') {
        const sanitizedData = { ...data };
        delete sanitizedData.client_id;
        delete sanitizedData.client_filled_at;
        const fallbackInsertWithoutClientColumns = await pool.query(createInsertQuery(table, sanitizedData));
        return { row: fallbackInsertWithoutClientColumns.rows[0], created: true };
      }

      if (error?.code !== '42P10') throw error;

      const existingResult = await pool.query(
        `SELECT * FROM ${table} WHERE client_id = $1 ORDER BY id DESC LIMIT 1`,
        [data.client_id]
      );
      if (existingResult.rows[0]) {
        return { row: existingResult.rows[0], created: false };
      }

      try {
        const fallbackInsertOnConstraintMissing = await pool.query(createInsertQuery(table, data));
        return { row: fallbackInsertOnConstraintMissing.rows[0], created: true };
      } catch (fallbackError) {
        if (fallbackError?.code !== '42703') throw fallbackError;
        const sanitizedData = { ...data };
        delete sanitizedData.client_id;
        delete sanitizedData.client_filled_at;
        const fallbackInsertWithoutClientColumns = await pool.query(createInsertQuery(table, sanitizedData));
        return { row: fallbackInsertWithoutClientColumns.rows[0], created: true };
      }
    }
  }

  try {
    const fallbackInsert = await pool.query(createInsertQuery(table, data));
    return { row: fallbackInsert.rows[0], created: true };
  } catch (fallbackError) {
    if (fallbackError?.code !== '42703') throw fallbackError;
    const sanitizedData = { ...data };
    delete sanitizedData.client_id;
    delete sanitizedData.client_filled_at;
    const fallbackInsertWithoutClientColumns = await pool.query(createInsertQuery(table, sanitizedData));
    return { row: fallbackInsertWithoutClientColumns.rows[0], created: true };
  }
};
const normalizeCPF = (cpf) => String(cpf || '').replace(/\D/g, '');

const parseOptionalInteger = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return { error: `${fieldName} deve ser um número válido` };
  }
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
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { error: `${fieldName} deve ser um inteiro positivo válido` };
  }
  return { value: parsed };
};

const isValidDateString = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const parseEmployeeIdParam = (req, res) => {
  const parsed = parseRequiredInteger(req.params.id, 'employeeId');
  if (parsed?.error) {
    res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'employeeId inválido' });
    return null;
  }
  return parsed.value;
};

const passthrough = (_req, _res, next) => next();
const shouldRequireEmployeeAuth = process.env.REQUIRE_EMPLOYEE_AUTH === 'true';
const employeeParamsAuth = shouldRequireEmployeeAuth
  ? [requireEmployeeAuth, guardEmployeeScope('params')]
  : [passthrough];
const employeeBodyAuth = shouldRequireEmployeeAuth
  ? [requireEmployeeAuth, guardEmployeeScope('body')]
  : [passthrough];


const requireAdminKeyIfConfigured = (req, res, next) => {
  if (!process.env.ADMIN_KEY) return next();
  const headerKey = req.header('x-admin-key');
  if (headerKey && headerKey === process.env.ADMIN_KEY) return next();
  return res.status(401).json({ errorCode: 'UNAUTHORIZED', message: 'x-admin-key inválido ou ausente' });
};


app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, status: 'ok', database: 'connected' });
  } catch (error) {
    handleServerError(res, error, 'health-check');
  }
});

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, status: 'ok', database: 'connected' });
  } catch (error) {
    handleServerError(res, error, 'health-check');
  }
});


/* =========================
   AUTH
========================= */
app.post('/api/auth/login', async (req, res) => {
  try {
    const rawCpf = req.body?.cpf;
    const cpf = rawCpf ? normalizeCPF(rawCpf) : '';
    const employeeIdParsed = cpf ? null : parseRequiredInteger(req.body?.employee_id, 'employee_id');
    const pin = String(req.body?.pin || '').trim();

    if ((!cpf && employeeIdParsed?.error) || !pin || pin.length < 4 || pin.length > 12) {
      return res.status(401).json({ errorCode: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' });
    }

    if (cpf && cpf.length !== 11) {
      return res.status(401).json({ errorCode: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' });
    }

    const result = cpf
      ? await pool.query(
          `SELECT id, name, cpf, role, email, phone, base, created_at, access_pin_hash
           FROM employees
           WHERE cpf = $1
           LIMIT 1`,
          [cpf]
        )
      : await pool.query(
          `SELECT id, name, cpf, role, email, phone, base, created_at, access_pin_hash
           FROM employees
           WHERE id = $1`,
          [employeeIdParsed.value]
        );

    const employee = result.rows[0];
    if (!employee) {
      return res.status(401).json({ errorCode: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' });
    }

    if (!employee.access_pin_hash) {
      return res.status(403).json({ errorCode: 'PIN_NOT_SET', message: 'PIN não configurado para este colaborador' });
    }

    const isValid = await bcrypt.compare(pin, employee.access_pin_hash);
    if (!isValid) {
      return res.status(401).json({ errorCode: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' });
    }

    const token = signEmployeeToken(employee.id);
    return res.json({
      token,
      employee: {
        id: employee.id,
        name: employee.name,
        cpf: employee.cpf,
        role: employee.role,
        email: employee.email,
        phone: employee.phone,
        base: employee.base,
        created_at: employee.created_at,
      },
    });
  } catch (error) {
    handleServerError(res, error, 'auth-login');
  }
});

app.post('/api/admin/employees/:id/pin', async (req, res) => {
  try {
    if (req.auth?.role !== 'admin') {
      return res.status(401).json({ errorCode: 'UNAUTHORIZED', message: 'Acesso admin obrigatório' });
    }

    const employeeId = parseEmployeeIdParam(req, res);
    if (!employeeId) return;

    const pin = String(req.body?.pin || '').trim();
    if (!pin || pin.length < 4 || pin.length > 12 || !/^\d+$/.test(pin)) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'PIN inválido (use 4-12 dígitos)' });
    }

    const hash = await bcrypt.hash(pin, 10);
    const result = await pool.query(
      `UPDATE employees
       SET access_pin_hash = $1,
           access_pin_updated_at = NOW()
       WHERE id = $2
       RETURNING id`,
      [hash, employeeId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'Colaborador não encontrado' });
    }

    return res.json({ ok: true });
  } catch (error) {
    handleServerError(res, error, 'admin-set-pin');
  }
});

/* =========================
   EMPLOYEES
========================= */
app.get('/api/employees', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, cpf, role, email, phone, base, created_at
      FROM employees
      ORDER BY id ASC
    `);
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'employees-list');
  }
});

app.get('/api/employees/:id', ...employeeParamsAuth, async (req, res) => {
  try {
    const employeeId = parseEmployeeIdParam(req, res);
    if (!employeeId) return;
    const result = await pool.query(
      `SELECT id, name, cpf, role, email, phone, base, created_at
       FROM employees
       WHERE id = $1`,
      [employeeId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'Colaborador não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'employees-get-by-id');
  }
});

app.post('/api/employees', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const data = pickData(req.body, ['name', 'cpf', 'role', 'email', 'phone', 'base']);
    if (!data.name)
      return res
        .status(400)
        .json({ errorCode: 'VALIDATION_ERROR', message: 'Campo name é obrigatório' });
    if (!data.role)
      return res
        .status(400)
        .json({ errorCode: 'VALIDATION_ERROR', message: 'Campo role é obrigatório' });
    if (!data.cpf)
      return res
        .status(400)
        .json({ errorCode: 'VALIDATION_ERROR', message: 'Campo cpf é obrigatório' });

    data.cpf = normalizeCPF(data.cpf); // armazena normalizado
    const q = createInsertQuery('employees', data);
    const result = await pool.query(q);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'employees-create');
  }
});

/* =========================
   DASHBOARD METRICS
========================= */
app.get('/api/dashboard/metrics', async (_req, res) => {
  try {
    const q = `
      SELECT
        (SELECT COUNT(*)::int FROM employees) AS "employeesTotal",
        (SELECT COUNT(*)::int FROM deployments WHERE end_date_actual IS NULL) AS "activeDeployments",
        (SELECT COUNT(*)::int FROM daily_reports WHERE approval_status = 'Pendente') AS "dailyReportsPending",
        (SELECT COUNT(*)::int FROM financial_requests WHERE status IN ('Solicitado','Aprovado')) AS "financialRequestsPending",
        (SELECT COUNT(*)::int FROM documents
          WHERE expiration_date IS NOT NULL AND expiration_date < CURRENT_DATE) AS "documentsExpired",
        (SELECT COUNT(*)::int FROM documents
          WHERE expiration_date IS NOT NULL
            AND expiration_date >= CURRENT_DATE
            AND expiration_date <= CURRENT_DATE + INTERVAL '30 days') AS "documentsExpiringSoon",
        (
          SELECT COUNT(*)::int
          FROM documents d
          JOIN deployments dep ON dep.employee_id = d.employee_id
          WHERE dep.end_date_actual IS NULL
            AND d.expiration_date IS NOT NULL
            AND d.expiration_date::date BETWEEN dep.start_date::date AND COALESCE(dep.end_date_actual, dep.end_date_expected)::date
        ) AS "documentsExpiringDuringDeployment"
    `;
    const result = await pool.query(q);
    res.json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'dashboard-metrics');
  }
});

/* =========================
   VESSELS
========================= */
app.get('/api/vessels', async (_req, res) => {
  try {
    const result = await pool.query('SELECT id, name, type, client FROM vessels ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'vessels-list');
  }
});

app.post('/api/vessels', async (req, res) => {
  try {
    const data = pickData(req.body, ['name', 'type', 'client']);
    if (!data.name || !data.type)
      return res
        .status(400)
        .json({ errorCode: 'VALIDATION_ERROR', message: 'name e type são obrigatórios' });
    const result = await pool.query(createInsertQuery('vessels', data));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'vessels-create');
  }
});

/* =========================
   DOCUMENT TYPES
========================= */
app.get('/api/document-types', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, code, name, category, requires_expiration FROM document_types ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'document-types-list');
  }
});

app.post('/api/document-types', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const data = pickData(req.body, ['code', 'name', 'category', 'requires_expiration']);
    if (!data.code || !data.name)
      return res
        .status(400)
        .json({ errorCode: 'VALIDATION_ERROR', message: 'code e name são obrigatórios' });
    const parsedRequiresExpiration = parseOptionalBoolean(
      data.requires_expiration,
      'requires_expiration'
    );
    if (parsedRequiresExpiration?.error) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: parsedRequiresExpiration.error,
      });
    }
    if (parsedRequiresExpiration) {
      data.requires_expiration = parsedRequiresExpiration.value;
    }

    const result = await pool.query(createInsertQuery('document_types', data));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'document-types-create');
  }
});

/* =========================
   DOCUMENTS
========================= */
app.get('/api/documents', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, dt.code AS document_code, dt.name AS document_name
      FROM documents d
      LEFT JOIN document_types dt ON dt.id = d.document_type_id
      ORDER BY d.id ASC
    `);
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'documents-list');
  }
});

app.get('/api/employees/:id/documents', ...employeeParamsAuth, async (req, res) => {
  try {
    const employeeId = parseEmployeeIdParam(req, res);
    if (!employeeId) return;
    const result = await pool.query(
      `SELECT d.*, dt.code AS document_code, dt.name AS document_name
       FROM documents d
       LEFT JOIN document_types dt ON dt.id = d.document_type_id
       WHERE d.employee_id = $1
       ORDER BY d.id ASC`,
      [employeeId]
    );
    res.json(result.rows);
  } catch (error) {
    if (error?.code === '42P01') return res.json([]);
    handleServerError(res, error, 'documents-by-employee');
  }
});

app.post('/api/documents', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const data = pickData(req.body, [
      'employee_id',
      'document_type_id',
      'issue_date',
      'expiration_date',
      'file_url',
      'evidence_type',
      'evidence_ref',
      'notes',
      'verified',
      'verified_by',
      'verified_at',
    ]);

    if (!data.employee_id || !data.document_type_id || !data.issue_date) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'employee_id, document_type_id, issue_date são obrigatórios',
      });
    }

    const employeeIdParsed = parseRequiredInteger(data.employee_id, 'employee_id');
    if (employeeIdParsed.error) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: employeeIdParsed.error });
    }
    data.employee_id = employeeIdParsed.value;

    const documentTypeIdParsed = parseRequiredInteger(data.document_type_id, 'document_type_id');
    if (documentTypeIdParsed.error) {
      return res
        .status(400)
        .json({ errorCode: 'VALIDATION_ERROR', message: documentTypeIdParsed.error });
    }
    data.document_type_id = documentTypeIdParsed.value;

    if (!isValidDateString(data.issue_date)) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'issue_date deve ser uma data válida',
      });
    }

    if (data.expiration_date && !isValidDateString(data.expiration_date)) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'expiration_date deve ser uma data válida',
      });
    }

    const docTypeResult = await pool.query(
      'SELECT id, requires_expiration FROM document_types WHERE id = $1 LIMIT 1',
      [data.document_type_id]
    );
    const documentType = docTypeResult.rows[0];

    if (!documentType) {
      return res.status(404).json({
        errorCode: 'NOT_FOUND',
        message: 'Tipo de documento não encontrado',
      });
    }

    if (documentType.requires_expiration && !data.expiration_date) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'expiration_date é obrigatório para este tipo de documento',
      });
    }

    if (!documentType.requires_expiration) {
      data.expiration_date = null;
    }

    const parsedVerified = parseOptionalBoolean(data.verified, 'verified');
    if (parsedVerified?.error) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: parsedVerified.error });
    }
    data.verified = parsedVerified ? parsedVerified.value : false;

    if (data.verified && !data.verified_at) {
      data.verified_at = new Date().toISOString();
    }

    if (data.verified_at && !isValidDateString(data.verified_at)) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'verified_at deve ser uma data válida',
      });
    }

    const result = await pool.query(
      `INSERT INTO documents (
        employee_id,
        document_type_id,
        issue_date,
        expiration_date,
        file_url,
        evidence_type,
        evidence_ref,
        notes,
        verified,
        verified_by,
        verified_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (employee_id, document_type_id)
      DO UPDATE SET
        issue_date = EXCLUDED.issue_date,
        expiration_date = EXCLUDED.expiration_date,
        file_url = EXCLUDED.file_url,
        evidence_type = EXCLUDED.evidence_type,
        evidence_ref = EXCLUDED.evidence_ref,
        notes = EXCLUDED.notes,
        verified = EXCLUDED.verified,
        verified_by = EXCLUDED.verified_by,
        verified_at = EXCLUDED.verified_at,
        updated_at = NOW()
      RETURNING *`,
      [
        data.employee_id,
        data.document_type_id,
        data.issue_date,
        data.expiration_date || null,
        data.file_url || null,
        data.evidence_type || null,
        data.evidence_ref || null,
        data.notes || null,
        Boolean(data.verified),
        data.verified_by || null,
        data.verified_at || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'documents-create');
  }
});

/* =========================
   DEPLOYMENTS
========================= */
app.get('/api/deployments', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM deployments ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'deployments-list');
  }
});

app.get('/api/employees/:id/deployments', ...employeeParamsAuth, async (req, res) => {
  try {
    const employeeId = parseEmployeeIdParam(req, res);
    if (!employeeId) return;
    const result = await pool.query(
      'SELECT * FROM deployments WHERE employee_id = $1 ORDER BY id ASC',
      [employeeId]
    );
    res.json(result.rows);
  } catch (error) {
    if (error?.code === '42P01') return res.json([]);
    handleServerError(res, error, 'deployments-by-employee');
  }
});

app.post('/api/deployments', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const data = pickData(req.body, [
      'employee_id',
      'vessel_id',
      'start_date',
      'end_date_expected',
      'end_date_actual',
      'notes',
    ]);
    if (!data.employee_id || !data.start_date || !data.end_date_expected) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'employee_id, start_date, end_date_expected são obrigatórios',
      });
    }
    const result = await pool.query(createInsertQuery('deployments', data));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'deployments-create');
  }
});

/* =========================
   EPI CATALOG / DELIVERIES
========================= */
app.get('/api/epi/catalog', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, code, ca, unit, stock_qty, min_stock, active, created_at, updated_at FROM epi_catalog ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'epi-catalog-list');
  }
});

app.post('/api/epi/catalog', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const data = pickData(req.body, [
      'name',
      'code',
      'ca',
      'unit',
      'stock_qty',
      'min_stock',
      'active',
    ]);
    if (!data.name)
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'name é obrigatório' });

    const parsedStockQty = parseOptionalInteger(data.stock_qty, 'stock_qty');
    if (parsedStockQty?.error) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: parsedStockQty.error });
    }
    if (parsedStockQty) {
      data.stock_qty = parsedStockQty.value;
    }

    const parsedMinStock = parseOptionalInteger(data.min_stock, 'min_stock');
    if (parsedMinStock?.error) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: parsedMinStock.error });
    }
    if (parsedMinStock) {
      data.min_stock = parsedMinStock.value;
    }

    const parsedActive = parseOptionalBoolean(data.active, 'active');
    if (parsedActive?.error) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: parsedActive.error });
    }
    if (parsedActive) {
      data.active = parsedActive.value;
    }

    const result = await pool.query(createInsertQuery('epi_catalog', data));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'epi-catalog-create');
  }
});

app.get('/api/epi/deliveries', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM epi_deliveries ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'epi-deliveries-list');
  }
});

app.get('/api/employees/:id/epi-deliveries', ...employeeParamsAuth, async (req, res) => {
  try {
    const employeeId = parseEmployeeIdParam(req, res);
    if (!employeeId) return;
    const result = await pool.query(
      'SELECT * FROM epi_deliveries WHERE employee_id = $1 ORDER BY id ASC',
      [employeeId]
    );
    res.json(result.rows);
  } catch (error) {
    if (error?.code === '42P01') return res.json([]);
    handleServerError(res, error, 'epi-deliveries-by-employee');
  }
});

app.post('/api/epi/deliveries', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const data = pickData(req.body, [
      'employee_id',
      'epi_item_id',
      'delivery_date',
      'quantity',
      'signature_url',
    ]);
    if (!data.employee_id || !data.epi_item_id) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'employee_id e epi_item_id são obrigatórios',
      });
    }
    const result = await pool.query(createInsertQuery('epi_deliveries', data));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'epi-deliveries-create');
  }
});

/* =========================
   DAILY REPORTS
========================= */
app.get('/api/daily-reports', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM daily_reports ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'daily-reports-list');
  }
});

app.get('/api/employees/:id/daily-reports', ...employeeParamsAuth, async (req, res) => {
  try {
    const employeeId = parseEmployeeIdParam(req, res);
    if (!employeeId) return;
    const result = await pool.query(
      'SELECT * FROM daily_reports WHERE employee_id = $1 ORDER BY id DESC',
      [employeeId]
    );
    res.json(result.rows);
  } catch (error) {
    if (error?.code === '42P01') return res.json([]);
    handleServerError(res, error, 'daily-reports-by-employee');
  }
});

app.post('/api/daily-reports', ...employeeBodyAuth, async (req, res) => {
  try {
    const data = pickData(req.body, [
      'employee_id',
      'report_date',
      'description',
      'hours_worked',
      'approval_status',
      'approved_by',
      'client_id',
      'client_filled_at',
    ]);
    if (!data.employee_id || !data.description) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'employee_id e description são obrigatórios',
      });
    }
    const result = await insertIdempotentByClientId('daily_reports', data);
    res.status(result.created ? 201 : 200).json(result.row);
  } catch (error) {
    if (error?.code === 'TABLE_MISSING') {
      return res.status(500).json({ errorCode: 'SCHEMA_ERROR', message: error.message });
    }
    handleServerError(res, error, 'daily-reports-create');
  }
});

/* =========================
   SERVICE ORDERS
========================= */
app.get('/api/service-orders', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM service_orders ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'service-orders-list');
  }
});

app.get('/api/employees/:id/service-orders', ...employeeParamsAuth, async (req, res) => {
  try {
    const employeeId = parseEmployeeIdParam(req, res);
    if (!employeeId) return;
    const result = await pool.query(
      'SELECT * FROM service_orders WHERE employee_id = $1 ORDER BY id DESC',
      [employeeId]
    );
    res.json(result.rows);
  } catch (error) {
    if (error?.code === '42P01') return res.json([]);
    handleServerError(res, error, 'service-orders-by-employee');
  }
});

app.post('/api/service-orders', ...employeeBodyAuth, async (req, res) => {
  try {
    const data = pickData(req.body, [
      'employee_id',
      'os_number',
      'title',
      'description',
      'priority',
      'opened_at',
      'approval_status',
      'vessel_id',
      'status',
      'client_id',
      'client_filled_at',
    ]);
    if (!data.description) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'description é obrigatório',
      });
    }
    if (!data.os_number) {
      data.os_number = `OS-${Date.now()}`;
    }
    const result = await insertIdempotentByClientId('service_orders', data);
    res.status(result.created ? 201 : 200).json(result.row);
  } catch (error) {
    if (error?.code === 'TABLE_MISSING') {
      return res.status(500).json({ errorCode: 'SCHEMA_ERROR', message: error.message });
    }
    handleServerError(res, error, 'service-orders-create');
  }
});

/* =========================
   FINANCIAL REQUESTS
========================= */
app.get('/api/financial-requests', async (req, res) => {
  try {
    const { type } = req.query;
    if (type) {
      const result = await pool.query(
        'SELECT * FROM financial_requests WHERE type = $1 ORDER BY id ASC',
        [type]
      );
      return res.json(result.rows);
    }
    const result = await pool.query('SELECT * FROM financial_requests ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'financial-requests-list');
  }
});

app.get('/api/employees/:id/financial-requests', ...employeeParamsAuth, async (req, res) => {
  try {
    const employeeId = parseEmployeeIdParam(req, res);
    if (!employeeId) return;
    const result = await pool.query(
      'SELECT * FROM financial_requests WHERE employee_id = $1 ORDER BY id DESC',
      [employeeId]
    );
    res.json(result.rows);
  } catch (error) {
    if (error?.code === '42P01') return res.json([]);
    handleServerError(res, error, 'financial-requests-by-employee');
  }
});

app.post('/api/financial-requests', ...employeeBodyAuth, async (req, res) => {
  try {
    const data = pickData(req.body, ['employee_id', 'type', 'amount', 'description', 'status', 'client_id', 'client_filled_at']);
    if (!data.employee_id || !data.type || data.amount === undefined) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'employee_id, type e amount são obrigatórios',
      });
    }
    const result = await insertIdempotentByClientId('financial_requests', data);
    res.status(result.created ? 201 : 200).json(result.row);
  } catch (error) {
    if (error?.code === 'TABLE_MISSING') {
      return res.status(500).json({ errorCode: 'SCHEMA_ERROR', message: error.message });
    }
    handleServerError(res, error, 'financial-requests-create');
  }
});

/* =========================
   STUBS (pra não quebrar telas antigas)
========================= */
app.get('/api/checkins', (_req, res) => res.json([]));
app.post('/api/checkins', ...employeeBodyAuth, (_req, res) => res.status(201).json({ ok: true }));

app.get('/api/profile', (_req, res) => res.json({}));

app.get('/', (_req, res) => res.send('API Logística Offshore - Online 🚀'));

const bootstrap = async () => {
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 API rodando em http://localhost:${port}`);
  });
};

bootstrap().catch((error) => {
  console.error('[BOOT] erro fatal ao iniciar API:', error?.stack || error);
  process.exit(1);
});
