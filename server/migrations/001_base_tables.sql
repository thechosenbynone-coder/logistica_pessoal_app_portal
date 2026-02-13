CREATE TABLE IF NOT EXISTS daily_reports (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER,
  report_date DATE,
  description TEXT,
  hours_worked NUMERIC,
  approval_status TEXT,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_requests (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER,
  type TEXT,
  amount NUMERIC,
  description TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
