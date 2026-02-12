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

const parseRequiredInteger = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return { error: `${fieldName} deve ser um número válido` };
  }
  return { value: Math.trunc(parsed) };
};

const isValidDateString = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
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

app.post('/api/document-types', async (req, res) => {
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
  await ensureDocumentationSchema();
  await ensureEpiCatalogSchema();
  await ensureEpiDeliveriesSchema();
  app.listen(port, () => {
    console.log(`API rodando na porta ${port}`);
  });
};

bootstrap().catch((error) => {
  console.error('[BOOT] erro fatal ao iniciar API:', error?.stack || error);
  process.exit(1);
});
