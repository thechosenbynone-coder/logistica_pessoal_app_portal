ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE employees
  SET updated_at = NOW()
  WHERE updated_at IS NULL;
ALTER TABLE employees
  ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE employees
  ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE daily_reports
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE daily_reports
  SET updated_at = COALESCE(created_at, NOW())
  WHERE updated_at IS NULL;
ALTER TABLE daily_reports
  ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE daily_reports
  ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE service_orders
  SET updated_at = COALESCE(created_at, NOW())
  WHERE updated_at IS NULL;
ALTER TABLE service_orders
  ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE service_orders
  ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE financial_requests
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE financial_requests
  SET updated_at = COALESCE(created_at, NOW())
  WHERE updated_at IS NULL;
ALTER TABLE financial_requests
  ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE financial_requests
  ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE deployments
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
UPDATE deployments
  SET created_at = NOW()
  WHERE created_at IS NULL;
ALTER TABLE deployments
  ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE deployments
  ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE deployments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE deployments
  SET updated_at = COALESCE(created_at, NOW())
  WHERE updated_at IS NULL;
ALTER TABLE deployments
  ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE deployments
  ALTER COLUMN updated_at SET NOT NULL;
