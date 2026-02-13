DO $$ BEGIN
  ALTER TABLE service_orders ADD COLUMN employee_id INTEGER;
EXCEPTION WHEN duplicate_column THEN END $$;
DO $$ BEGIN
  ALTER TABLE service_orders ADD COLUMN title TEXT;
EXCEPTION WHEN duplicate_column THEN END $$;
DO $$ BEGIN
  ALTER TABLE service_orders ADD COLUMN priority TEXT;
EXCEPTION WHEN duplicate_column THEN END $$;
DO $$ BEGIN
  ALTER TABLE service_orders ADD COLUMN opened_at DATE;
EXCEPTION WHEN duplicate_column THEN END $$;
DO $$ BEGIN
  ALTER TABLE service_orders ADD COLUMN approval_status TEXT;
EXCEPTION WHEN duplicate_column THEN END $$;

CREATE INDEX IF NOT EXISTS idx_service_orders_employee_id ON service_orders(employee_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_employee_created_desc ON service_orders(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_reports_employee_created_desc ON daily_reports(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_requests_employee_created_desc ON financial_requests(employee_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM daily_reports WHERE employee_id IS NULL) THEN
    ALTER TABLE daily_reports ALTER COLUMN employee_id SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM service_orders WHERE employee_id IS NULL) THEN
    ALTER TABLE service_orders ALTER COLUMN employee_id SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM financial_requests WHERE employee_id IS NULL) THEN
    ALTER TABLE financial_requests ALTER COLUMN employee_id SET NOT NULL;
  END IF;
END $$;
