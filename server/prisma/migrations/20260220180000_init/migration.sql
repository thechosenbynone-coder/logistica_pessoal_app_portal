CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name TEXT,
  cpf TEXT,
  role TEXT,
  email TEXT,
  phone TEXT,
  base TEXT,
  access_pin_hash TEXT,
  access_pin_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vessels (
  id SERIAL PRIMARY KEY,
  name TEXT,
  type TEXT,
  client TEXT
);

CREATE TABLE IF NOT EXISTS document_types (
  id SERIAL PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  category TEXT,
  requires_expiration BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

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
);

CREATE TABLE IF NOT EXISTS deployments (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER,
  vessel_id INTEGER,
  start_date DATE,
  end_date_expected DATE,
  end_date_actual DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT deployments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT deployments_vessel_id_fkey FOREIGN KEY (vessel_id) REFERENCES vessels(id) ON DELETE SET NULL ON UPDATE CASCADE
);

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
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT documents_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT documents_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES document_types(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS epi_deliveries (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  epi_item_id INTEGER NOT NULL,
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity INTEGER NOT NULL DEFAULT 1,
  signature_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT epi_deliveries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT epi_deliveries_epi_item_id_fkey FOREIGN KEY (epi_item_id) REFERENCES epi_catalog(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_reports (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER,
  report_date DATE,
  description TEXT,
  hours_worked NUMERIC(10,2),
  approval_status TEXT,
  approved_by TEXT,
  client_id TEXT,
  client_filled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT daily_reports_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS service_orders (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER,
  os_number TEXT,
  title TEXT,
  description TEXT,
  priority TEXT,
  opened_at DATE,
  approval_status TEXT,
  vessel_id INTEGER,
  status TEXT,
  client_id TEXT,
  client_filled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_orders_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT service_orders_vessel_id_fkey FOREIGN KEY (vessel_id) REFERENCES vessels(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS financial_requests (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER,
  type TEXT,
  amount NUMERIC(10,2),
  description TEXT,
  status TEXT,
  client_id TEXT,
  client_filled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT financial_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_types_code
  ON document_types (code);
CREATE INDEX IF NOT EXISTS idx_documents_employee_id
  ON documents (employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type_id
  ON documents (document_type_id);
CREATE INDEX IF NOT EXISTS idx_documents_expiration_date
  ON documents (expiration_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_employee_document_type_unique
  ON documents (employee_id, document_type_id);
CREATE INDEX IF NOT EXISTS idx_epi_deliveries_employee_id
  ON epi_deliveries (employee_id);
CREATE INDEX IF NOT EXISTS idx_epi_deliveries_epi_item_id
  ON epi_deliveries (epi_item_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_reports_client_id_unique
  ON daily_reports (client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_orders_client_id_unique
  ON service_orders (client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_requests_client_id_unique
  ON financial_requests (client_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_employee_id
  ON service_orders (employee_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_employee_created_desc
  ON daily_reports (employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_orders_employee_created_desc
  ON service_orders (employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_requests_employee_created_desc
  ON financial_requests (employee_id, created_at DESC);
