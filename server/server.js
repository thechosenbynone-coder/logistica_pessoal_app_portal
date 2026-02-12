import express from 'express';
import cors from 'cors';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.use(cors());
app.use(express.json());

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

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    handleServerError(res, error, 'health-check');
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

app.post('/api/employees', async (req, res) => {
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
            AND d.expiration_date::date BETWEEN dep.start_date::date AND dep.end_date_expected::date
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

app.post('/api/document-types', async (req, res) => {
  try {
    const data = pickData(req.body, ['code', 'name', 'category', 'requires_expiration']);
    if (!data.code || !data.name)
      return res
        .status(400)
        .json({ errorCode: 'VALIDATION_ERROR', message: 'code e name são obrigatórios' });
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

app.get('/api/employees/:id/documents', async (req, res) => {
  try {
    const employeeId = Number(req.params.id);
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
    handleServerError(res, error, 'documents-by-employee');
  }
});

app.post('/api/documents', async (req, res) => {
  try {
    const data = pickData(req.body, [
      'employee_id',
      'document_type_id',
      'issue_date',
      'expiration_date',
      'file_url',
    ]);
    if (!data.employee_id || !data.document_type_id || !data.issue_date) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'employee_id, document_type_id, issue_date são obrigatórios',
      });
    }
    const result = await pool.query(createInsertQuery('documents', data));
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

app.get('/api/employees/:id/deployments', async (req, res) => {
  try {
    const employeeId = Number(req.params.id);
    const result = await pool.query(
      'SELECT * FROM deployments WHERE employee_id = $1 ORDER BY id ASC',
      [employeeId]
    );
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'deployments-by-employee');
  }
});

app.post('/api/deployments', async (req, res) => {
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

app.post('/api/epi/catalog', async (req, res) => {
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

app.get('/api/employees/:id/epi-deliveries', async (req, res) => {
  try {
    const employeeId = Number(req.params.id);
    const result = await pool.query(
      'SELECT * FROM epi_deliveries WHERE employee_id = $1 ORDER BY id ASC',
      [employeeId]
    );
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'epi-deliveries-by-employee');
  }
});

app.post('/api/epi/deliveries', async (req, res) => {
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

app.post('/api/daily-reports', async (req, res) => {
  try {
    const data = pickData(req.body, [
      'employee_id',
      'report_date',
      'description',
      'hours_worked',
      'approval_status',
      'approved_by',
    ]);
    if (!data.employee_id || !data.description) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'employee_id e description são obrigatórios',
      });
    }
    const result = await pool.query(createInsertQuery('daily_reports', data));
    res.status(201).json(result.rows[0]);
  } catch (error) {
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

app.post('/api/service-orders', async (req, res) => {
  try {
    const data = pickData(req.body, ['os_number', 'description', 'vessel_id', 'status']);
    if (!data.os_number || !data.description) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'os_number e description são obrigatórios',
      });
    }
    const result = await pool.query(createInsertQuery('service_orders', data));
    res.status(201).json(result.rows[0]);
  } catch (error) {
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

app.post('/api/financial-requests', async (req, res) => {
  try {
    const data = pickData(req.body, ['employee_id', 'type', 'amount', 'description', 'status']);
    if (!data.employee_id || !data.type || data.amount === undefined) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'employee_id, type e amount são obrigatórios',
      });
    }
    const result = await pool.query(createInsertQuery('financial_requests', data));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'financial-requests-create');
  }
});

/* =========================
   STUBS (pra não quebrar telas antigas)
========================= */
app.get('/api/checkins', (_req, res) => res.json([]));
app.post('/api/checkins', (_req, res) => res.status(201).json({ ok: true }));

app.get('/api/profile', (_req, res) => res.json({}));

app.get('/', (_req, res) => res.send('API Logística Offshore - Online 🚀'));

const bootstrap = async () => {
  await ensureEpiCatalogSchema();
  app.listen(port, () => {
    console.log(`API rodando na porta ${port}`);
  });
};

bootstrap().catch((error) => {
  console.error('[BOOT] erro fatal ao iniciar API:', error?.stack || error);
  process.exit(1);
});
