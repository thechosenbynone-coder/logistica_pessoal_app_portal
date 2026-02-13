import express from 'express';
import cors from 'cors';
import pg from 'pg';
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { migrate } from './src/migrate.js';
import { authOptional, guardEmployeeScope, requireEmployeeAuth, signEmployeeToken } from './src/auth.js';

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 3001;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const corsOrigin = process.env.CORS_ORIGIN || '*';
if (corsOrigin === '*') {
  app.use(cors());
} else {
  const origins = corsOrigin.split(',').map((item) => item.trim()).filter(Boolean);
  app.use(cors({ origin: origins }));
}
app.use(express.json());
app.use(authOptional);

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


async function ensureDocumentationSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_types (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE,
        name TEXT NOT NULL,
        category TEXT,
        requires_expiration BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`ALTER TABLE document_types ADD COLUMN IF NOT EXISTS code TEXT`);
    await pool.query(`ALTER TABLE document_types ADD COLUMN IF NOT EXISTS name TEXT`);
    await pool.query(`ALTER TABLE document_types ADD COLUMN IF NOT EXISTS category TEXT`);
    await pool.query(
      `ALTER TABLE document_types ADD COLUMN IF NOT EXISTS requires_expiration BOOLEAN`
    );
    await pool.query(`ALTER TABLE document_types ADD COLUMN IF NOT EXISTS created_at TIMESTAMP`);
    await pool.query(`ALTER TABLE document_types ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`);

    await pool.query(
      `UPDATE document_types SET requires_expiration = TRUE WHERE requires_expiration IS NULL`
    );
    await pool.query(`UPDATE document_types SET created_at = NOW() WHERE created_at IS NULL`);
    await pool.query(`UPDATE document_types SET updated_at = NOW() WHERE updated_at IS NULL`);

    await pool.query(
      `ALTER TABLE document_types ALTER COLUMN requires_expiration SET DEFAULT TRUE`
    );
    await pool.query(`ALTER TABLE document_types ALTER COLUMN created_at SET DEFAULT NOW()`);
    await pool.query(`ALTER TABLE document_types ALTER COLUMN updated_at SET DEFAULT NOW()`);
    await pool.query(`ALTER TABLE document_types ALTER COLUMN requires_expiration SET NOT NULL`);
    await pool.query(`ALTER TABLE document_types ALTER COLUMN created_at SET NOT NULL`);
    await pool.query(`ALTER TABLE document_types ALTER COLUMN updated_at SET NOT NULL`);
    await pool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_document_types_code ON document_types (code)`
    );

    await pool.query(`
      INSERT INTO document_types (code, name, category, requires_expiration)
      VALUES
        ('ASO', 'ASO', 'Médico', TRUE),
        ('CBSP', 'CBSP', 'Treinamento', TRUE),
        ('HUET', 'HUET', 'Treinamento', TRUE),
        ('NR-33', 'NR-33', 'NR', TRUE),
        ('NR-35', 'NR-35', 'NR', TRUE),
        ('NR-37', 'NR-37', 'NR', TRUE)
      ON CONFLICT (code) DO NOTHING
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        document_type_id INTEGER NOT NULL,
        issue_date DATE NOT NULL,
        expiration_date DATE,
        file_url TEXT,
        evidence_type TEXT,
        evidence_ref TEXT,
        notes TEXT,
        verified BOOLEAN NOT NULL DEFAULT FALSE,
        verified_by TEXT,
        verified_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS employee_id INTEGER`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_type_id INTEGER`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS issue_date DATE`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS expiration_date DATE`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_url TEXT`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS evidence_type TEXT`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS evidence_ref TEXT`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS notes TEXT`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS verified BOOLEAN`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS verified_by TEXT`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMP`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`);

    await pool.query(`UPDATE documents SET verified = FALSE WHERE verified IS NULL`);
    await pool.query(`UPDATE documents SET created_at = NOW() WHERE created_at IS NULL`);
    await pool.query(`UPDATE documents SET updated_at = NOW() WHERE updated_at IS NULL`);

    await pool.query(`ALTER TABLE documents ALTER COLUMN verified SET DEFAULT FALSE`);
    await pool.query(`ALTER TABLE documents ALTER COLUMN verified SET NOT NULL`);
    await pool.query(`ALTER TABLE documents ALTER COLUMN created_at SET DEFAULT NOW()`);
    await pool.query(`ALTER TABLE documents ALTER COLUMN updated_at SET DEFAULT NOW()`);
    await pool.query(`ALTER TABLE documents ALTER COLUMN created_at SET NOT NULL`);
    await pool.query(`ALTER TABLE documents ALTER COLUMN updated_at SET NOT NULL`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_documents_employee_id ON documents (employee_id)`);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_documents_document_type_id ON documents (document_type_id)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_documents_expiration_date ON documents (expiration_date)`
    );
    await pool.query(`
      DELETE FROM documents a
      USING documents b
      WHERE a.id < b.id
        AND a.employee_id = b.employee_id
        AND a.document_type_id = b.document_type_id
    `);
    await pool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_employee_document_type_unique ON documents (employee_id, document_type_id)`
    );

    console.log('[BOOT] documentation schema pronto');
  } catch (error) {
    console.error('[BOOT] falha ao ajustar schema de documentação:', error?.stack || error);
    throw error;
  }
}


async function ensureEpiCatalogSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS epi_catalog (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT,
        ca TEXT,
        unit TEXT,
        stock_qty INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`ALTER TABLE epi_catalog ADD COLUMN IF NOT EXISTS code TEXT`);
    await pool.query(`ALTER TABLE epi_catalog ADD COLUMN IF NOT EXISTS ca TEXT`);
    await pool.query(`ALTER TABLE epi_catalog ADD COLUMN IF NOT EXISTS unit TEXT`);
    await pool.query(`ALTER TABLE epi_catalog ADD COLUMN IF NOT EXISTS stock_qty INTEGER`);
    await pool.query(`ALTER TABLE epi_catalog ADD COLUMN IF NOT EXISTS min_stock INTEGER`);
    await pool.query(`ALTER TABLE epi_catalog ADD COLUMN IF NOT EXISTS active BOOLEAN`);
    await pool.query(`ALTER TABLE epi_catalog ADD COLUMN IF NOT EXISTS created_at TIMESTAMP`);
    await pool.query(`ALTER TABLE epi_catalog ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`);

    await pool.query(`UPDATE epi_catalog SET stock_qty = 0 WHERE stock_qty IS NULL`);
    await pool.query(`UPDATE epi_catalog SET min_stock = 0 WHERE min_stock IS NULL`);
    await pool.query(`UPDATE epi_catalog SET active = TRUE WHERE active IS NULL`);
    await pool.query(`UPDATE epi_catalog SET created_at = NOW() WHERE created_at IS NULL`);
    await pool.query(`UPDATE epi_catalog SET updated_at = NOW() WHERE updated_at IS NULL`);

    await pool.query(`ALTER TABLE epi_catalog ALTER COLUMN stock_qty SET DEFAULT 0`);
    await pool.query(`ALTER TABLE epi_catalog ALTER COLUMN min_stock SET DEFAULT 0`);
    await pool.query(`ALTER TABLE epi_catalog ALTER COLUMN active SET DEFAULT TRUE`);
    await pool.query(`ALTER TABLE epi_catalog ALTER COLUMN created_at SET DEFAULT NOW()`);
    await pool.query(`ALTER TABLE epi_catalog ALTER COLUMN updated_at SET DEFAULT NOW()`);
    await pool.query(`ALTER TABLE epi_catalog ALTER COLUMN stock_qty SET NOT NULL`);
    await pool.query(`ALTER TABLE epi_catalog ALTER COLUMN min_stock SET NOT NULL`);
    await pool.query(`ALTER TABLE epi_catalog ALTER COLUMN active SET NOT NULL`);
    await pool.query(`ALTER TABLE epi_catalog ALTER COLUMN created_at SET NOT NULL`);
    await pool.query(`ALTER TABLE epi_catalog ALTER COLUMN updated_at SET NOT NULL`);

    console.log('[BOOT] epi_catalog schema pronto');
  } catch (error) {
    console.error('[BOOT] falha ao ajustar schema de epi_catalog:', error?.stack || error);
    throw error;
  }
}

async function ensureEpiDeliveriesSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS epi_deliveries (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        epi_item_id INTEGER NOT NULL,
        delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
        quantity INTEGER NOT NULL DEFAULT 1,
        signature_url TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`ALTER TABLE epi_deliveries ADD COLUMN IF NOT EXISTS delivery_date DATE`);
    await pool.query(`ALTER TABLE epi_deliveries ADD COLUMN IF NOT EXISTS quantity INTEGER`);
    await pool.query(`ALTER TABLE epi_deliveries ADD COLUMN IF NOT EXISTS signature_url TEXT`);
    await pool.query(`ALTER TABLE epi_deliveries ADD COLUMN IF NOT EXISTS created_at TIMESTAMP`);
    await pool.query(`ALTER TABLE epi_deliveries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`);

    await pool.query(
      `UPDATE epi_deliveries SET delivery_date = CURRENT_DATE WHERE delivery_date IS NULL`
    );
    await pool.query(`UPDATE epi_deliveries SET quantity = 1 WHERE quantity IS NULL`);
    await pool.query(`UPDATE epi_deliveries SET created_at = NOW() WHERE created_at IS NULL`);
    await pool.query(`UPDATE epi_deliveries SET updated_at = NOW() WHERE updated_at IS NULL`);

    await pool.query(
      `ALTER TABLE epi_deliveries ALTER COLUMN delivery_date SET DEFAULT CURRENT_DATE`
    );
    await pool.query(`ALTER TABLE epi_deliveries ALTER COLUMN quantity SET DEFAULT 1`);
    await pool.query(`ALTER TABLE epi_deliveries ALTER COLUMN created_at SET DEFAULT NOW()`);
    await pool.query(`ALTER TABLE epi_deliveries ALTER COLUMN updated_at SET DEFAULT NOW()`);
    await pool.query(`ALTER TABLE epi_deliveries ALTER COLUMN delivery_date SET NOT NULL`);
    await pool.query(`ALTER TABLE epi_deliveries ALTER COLUMN quantity SET NOT NULL`);
    await pool.query(`ALTER TABLE epi_deliveries ALTER COLUMN created_at SET NOT NULL`);
    await pool.query(`ALTER TABLE epi_deliveries ALTER COLUMN updated_at SET NOT NULL`);

    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_epi_deliveries_employee_id ON epi_deliveries (employee_id)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_epi_deliveries_epi_item_id ON epi_deliveries (epi_item_id)`
    );

    console.log('[BOOT] epi_deliveries schema pronto');
  } catch (error) {
    console.error('[BOOT] falha ao ajustar schema de epi_deliveries:', error?.stack || error);
    throw error;
  }
}


async function ensureServiceOrdersSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_orders (
        id SERIAL PRIMARY KEY,
        os_number TEXT,
        description TEXT,
        vessel_id INTEGER,
        status TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`DO $$ BEGIN ALTER TABLE service_orders ADD COLUMN employee_id INTEGER; EXCEPTION WHEN duplicate_column THEN END $$;`);
    await pool.query(`DO $$ BEGIN ALTER TABLE service_orders ADD COLUMN title TEXT; EXCEPTION WHEN duplicate_column THEN END $$;`);
    await pool.query(`DO $$ BEGIN ALTER TABLE service_orders ADD COLUMN priority TEXT; EXCEPTION WHEN duplicate_column THEN END $$;`);
    await pool.query(`DO $$ BEGIN ALTER TABLE service_orders ADD COLUMN opened_at DATE; EXCEPTION WHEN duplicate_column THEN END $$;`);
    await pool.query(`DO $$ BEGIN ALTER TABLE service_orders ADD COLUMN approval_status TEXT; EXCEPTION WHEN duplicate_column THEN END $$;`);
    await pool.query(`DO $$ BEGIN ALTER TABLE service_orders ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN END $$;`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_service_orders_employee_id ON service_orders(employee_id)`);

    console.log('[BOOT] service_orders schema pronto');
  } catch (error) {
    console.error('[BOOT] falha ao ajustar schema de service_orders:', error?.stack || error);
    throw error;
  }
}


async function ensureClientSyncSchema() {
  try {
    await pool.query(`DO $$ BEGIN ALTER TABLE daily_reports ADD COLUMN client_id TEXT; EXCEPTION WHEN duplicate_column THEN END $$;`);
    await pool.query(`DO $$ BEGIN ALTER TABLE daily_reports ADD COLUMN client_filled_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN END $$;`);
    await pool.query(`DO $$ BEGIN ALTER TABLE service_orders ADD COLUMN client_id TEXT; EXCEPTION WHEN duplicate_column THEN END $$;`);
    await pool.query(`DO $$ BEGIN ALTER TABLE service_orders ADD COLUMN client_filled_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN END $$;`);
    await pool.query(`DO $$ BEGIN ALTER TABLE financial_requests ADD COLUMN client_id TEXT; EXCEPTION WHEN duplicate_column THEN END $$;`);
    await pool.query(`DO $$ BEGIN ALTER TABLE financial_requests ADD COLUMN client_filled_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN END $$;`);

    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_reports_client_id_unique ON daily_reports(client_id)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_service_orders_client_id_unique ON service_orders(client_id)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_requests_client_id_unique ON financial_requests(client_id)`);

    console.log('[BOOT] client sync schema pronto');
  } catch (error) {
    if (error?.code === '42P01') {
      console.log('[BOOT] client sync schema parcialmente aplicado (tabelas ausentes)');
      return;
    }
    console.error('[BOOT] falha ao ajustar schema de client sync:', error?.stack || error);
    throw error;
  }
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    handleServerError(res, error, 'health-check');
  }
});

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    handleServerError(res, error, 'health-check');
  }
});


/* =========================
   AUTH
========================= */
app.post('/api/auth/login', async (req, res) => {
  try {
    const employeeIdParsed = parseRequiredInteger(req.body?.employee_id, 'employee_id');
    const pin = String(req.body?.pin || '').trim();

    if (employeeIdParsed?.error || !pin || pin.length < 4 || pin.length > 12) {
      return res.status(401).json({ errorCode: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' });
    }

    const result = await pool.query(
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
  await migrate(pool);
  await ensureDocumentationSchema();
  await ensureEpiCatalogSchema();
  await ensureEpiDeliveriesSchema();
  if (process.env.USE_BOOTSTRAP_SCHEMA === 'true') {
    await ensureServiceOrdersSchema();
    await ensureClientSyncSchema();
  }
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 API rodando em http://localhost:${port}`);
  });
};

bootstrap().catch((error) => {
  console.error('[BOOT] erro fatal ao iniciar API:', error?.stack || error);
  process.exit(1);
});
