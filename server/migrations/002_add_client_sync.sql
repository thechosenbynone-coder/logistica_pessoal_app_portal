DO $$ BEGIN
  ALTER TABLE daily_reports ADD COLUMN client_id TEXT;
EXCEPTION WHEN duplicate_column THEN END $$;
DO $$ BEGIN
  ALTER TABLE daily_reports ADD COLUMN client_filled_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE service_orders ADD COLUMN client_id TEXT;
EXCEPTION WHEN duplicate_column THEN END $$;
DO $$ BEGIN
  ALTER TABLE service_orders ADD COLUMN client_filled_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE financial_requests ADD COLUMN client_id TEXT;
EXCEPTION WHEN duplicate_column THEN END $$;
DO $$ BEGIN
  ALTER TABLE financial_requests ADD COLUMN client_filled_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_reports_client_id_unique ON daily_reports(client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_orders_client_id_unique ON service_orders(client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_requests_client_id_unique ON financial_requests(client_id);
