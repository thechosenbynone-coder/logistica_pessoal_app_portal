import express from 'express';
import cors from 'cors';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

const handleServerError = (res, error, context) => {
  console.error(`[ERROR] ${context}:`, error.stack || error);
  res.status(500).json({
    errorCode: 'INTERNAL_ERROR',
    message: `Erro interno em ${context}`
  });
};

const pickData = (body, allowedKeys) => {
  const entries = Object.entries(body || {}).filter(([key]) => allowedKeys.includes(key));
  return Object.fromEntries(entries);
};

const createInsertQuery = (table, data) => {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const columns = keys.join(', ');
  return {
    text: `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
    values
  };
};

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    handleServerError(res, error, 'health-check');
  }
});

app.get('/api/employees', async (req, res) => {
  try {
    const query = `
      SELECT id, name, cpf, role, email, phone, base, created_at
      FROM employees
      ORDER BY id DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'employees-list');
  }
});

app.post('/api/employees', async (req, res) => {
  try {
    const data = pickData(req.body, ['name', 'cpf', 'role', 'email', 'phone', 'base']);
    if (!data.name) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'Campo name é obrigatório' });
    }

    const query = createInsertQuery('employees', data);
    const result = await pool.query(query);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'employees-create');
  }
});

app.get('/api/dashboard/metrics', async (req, res) => {
  try {
    const metricsQuery = `
      SELECT
        (SELECT COUNT(*)::int FROM employees) AS "employeesTotal",
        (SELECT COUNT(*)::int FROM deployments WHERE end_date_actual IS NULL) AS "activeDeployments",
        (SELECT COUNT(*)::int FROM daily_reports WHERE LOWER(COALESCE(status, '')) = 'pending') AS "dailyReportsPending",
        (SELECT COUNT(*)::int FROM financial_requests WHERE LOWER(COALESCE(status, '')) = 'pending') AS "financialRequestsPending",
        (SELECT COUNT(*)::int FROM documents WHERE expiration_date < CURRENT_DATE) AS "documentsExpired",
        (SELECT COUNT(*)::int FROM documents WHERE expiration_date >= CURRENT_DATE AND expiration_date <= CURRENT_DATE + INTERVAL '30 days') AS "documentsExpiringSoon",
        (
          SELECT COUNT(DISTINCT d.id)::int
          FROM documents d
          INNER JOIN deployments dep ON dep.employee_id = d.employee_id
          WHERE dep.end_date_actual IS NULL
            AND d.expiration_date IS NOT NULL
            AND d.expiration_date BETWEEN dep.start_date AND dep.end_date_expected
        ) AS "documentsExpiringDuringDeployment"
    `;

    const result = await pool.query(metricsQuery);
    res.json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'dashboard-metrics');
  }
});

app.get('/api/vessels', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vessels ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'vessels-list');
  }
});

app.post('/api/vessels', async (req, res) => {
  try {
    const data = pickData(req.body, ['name', 'imo', 'type', 'status']);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'Payload inválido' });
    }
    const result = await pool.query(createInsertQuery('vessels', data));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'vessels-create');
  }
});

app.get('/api/document-types', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM document_types ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'document-types-list');
  }
});

app.post('/api/document-types', async (req, res) => {
  try {
    const data = pickData(req.body, ['code', 'name', 'category', 'requires_expiration']);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'Payload inválido' });
    }
    const result = await pool.query(createInsertQuery('document_types', data));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'document-types-create');
  }
});

app.get('/api/documents', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM documents ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'documents-list');
  }
});

app.post('/api/documents', async (req, res) => {
  try {
    const data = pickData(req.body, ['employee_id', 'document_type_id', 'issue_date', 'expiration_date', 'file_url']);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'Payload inválido' });
    }
    const result = await pool.query(createInsertQuery('documents', data));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'documents-create');
  }
});

app.get('/api/deployments', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM deployments ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'deployments-list');
  }
});

app.post('/api/deployments', async (req, res) => {
  try {
    const data = pickData(req.body, ['employee_id', 'vessel_id', 'start_date', 'end_date_expected', 'end_date_actual', 'notes']);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'Payload inválido' });
    }
    const result = await pool.query(createInsertQuery('deployments', data));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'deployments-create');
  }
});

app.get('/api/epi/catalog', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM epi_catalog ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'epi-catalog-list');
  }
});

app.post('/api/epi/catalog', async (req, res) => {
  try {
    const data = pickData(req.body, ['name', 'ca_number', 'size', 'validity_months']);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'Payload inválido' });
    }
    const result = await pool.query(createInsertQuery('epi_catalog', data));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'epi-catalog-create');
  }
});

app.get('/api/epi/deliveries', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM epi_deliveries ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'epi-deliveries-list');
  }
});

app.post('/api/epi/deliveries', async (req, res) => {
  try {
    const data = pickData(req.body, ['employee_id', 'epi_id', 'delivered_at', 'quantity', 'notes']);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'Payload inválido' });
    }
    const result = await pool.query(createInsertQuery('epi_deliveries', data));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'epi-deliveries-create');
  }
});

app.get('/api/daily-reports', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM daily_reports ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'daily-reports-list');
  }
});

app.post('/api/daily-reports', async (req, res) => {
  try {
    const data = pickData(req.body, ['employee_id', 'report_date', 'status', 'notes']);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'Payload inválido' });
    }
    const result = await pool.query(createInsertQuery('daily_reports', data));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'daily-reports-create');
  }
});

app.get('/api/service-orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM service_orders ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'service-orders-list');
  }
});

app.post('/api/service-orders', async (req, res) => {
  try {
    const data = pickData(req.body, ['title', 'description', 'status', 'requested_by']);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'Payload inválido' });
    }
    const result = await pool.query(createInsertQuery('service_orders', data));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'service-orders-create');
  }
});

app.get('/api/financial-requests', async (req, res) => {
  try {
    const { type } = req.query;
    if (type) {
      const result = await pool.query('SELECT * FROM financial_requests WHERE type = $1 ORDER BY id DESC', [type]);
      return res.json(result.rows);
    }

    const result = await pool.query('SELECT * FROM financial_requests ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    handleServerError(res, error, 'financial-requests-list');
  }
});

app.post('/api/financial-requests', async (req, res) => {
  try {
    const data = pickData(req.body, ['employee_id', 'type', 'amount', 'status', 'request_date', 'description']);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'Payload inválido' });
    }
    const result = await pool.query(createInsertQuery('financial_requests', data));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleServerError(res, error, 'financial-requests-create');
  }
});

app.listen(port, () => {
  console.log(`API rodando na porta ${port}`);
});
