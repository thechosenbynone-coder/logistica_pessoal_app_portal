-- 003_service_orders_expand.sql
-- Objetivo:
-- - Garantir colunas novas em tabelas já existentes (banco antigo)
-- - Garantir created_at antes de criar índices que dependem disso
-- - Criar índices só se as colunas existirem

DO $$
BEGIN
  -- service_orders: expandir schema antigo
  IF to_regclass('public.service_orders') IS NOT NULL THEN
    ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS employee_id INTEGER;
    ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS title TEXT;
    ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS priority TEXT;
    ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS opened_at DATE;
    ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS approval_status TEXT;
  END IF;
END $$;

DO $$
BEGIN
  -- created_at: daily_reports
  IF to_regclass('public.daily_reports') IS NOT NULL THEN
    ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
    UPDATE daily_reports SET created_at = NOW() WHERE created_at IS NULL;
    ALTER TABLE daily_reports ALTER COLUMN created_at SET DEFAULT NOW();
    IF NOT EXISTS (SELECT 1 FROM daily_reports WHERE created_at IS NULL) THEN
      ALTER TABLE daily_reports ALTER COLUMN created_at SET NOT NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  -- created_at: service_orders
  IF to_regclass('public.service_orders') IS NOT NULL THEN
    ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
    UPDATE service_orders SET created_at = NOW() WHERE created_at IS NULL;
    ALTER TABLE service_orders ALTER COLUMN created_at SET DEFAULT NOW();
    IF NOT EXISTS (SELECT 1 FROM service_orders WHERE created_at IS NULL) THEN
      ALTER TABLE service_orders ALTER COLUMN created_at SET NOT NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  -- created_at: financial_requests
  IF to_regclass('public.financial_requests') IS NOT NULL THEN
    ALTER TABLE financial_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
    UPDATE financial_requests SET created_at = NOW() WHERE created_at IS NULL;
    ALTER TABLE financial_requests ALTER COLUMN created_at SET DEFAULT NOW();
    IF NOT EXISTS (SELECT 1 FROM financial_requests WHERE created_at IS NULL) THEN
      ALTER TABLE financial_requests ALTER COLUMN created_at SET NOT NULL;
    END IF;
  END IF;
END $$;

-- Índices: só cria se colunas existirem
DO $$
BEGIN
  IF to_regclass('public.service_orders') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='service_orders' AND column_name='employee_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='service_orders' AND column_name='created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_service_orders_employee_id ON service_orders(employee_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_service_orders_employee_created_desc ON service_orders(employee_id, created_at DESC)';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.daily_reports') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='daily_reports' AND column_name='employee_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='daily_reports' AND column_name='created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_daily_reports_employee_created_desc ON daily_reports(employee_id, created_at DESC)';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.financial_requests') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='financial_requests' AND column_name='employee_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='financial_requests' AND column_name='created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_financial_requests_employee_created_desc ON financial_requests(employee_id, created_at DESC)';
  END IF;
END $$;

-- NOT NULL: só aplica se não houver nulos
DO $$
BEGIN
  IF to_regclass('public.daily_reports') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='daily_reports' AND column_name='employee_id') THEN
    IF NOT EXISTS (SELECT 1 FROM daily_reports WHERE employee_id IS NULL) THEN
      ALTER TABLE daily_reports ALTER COLUMN employee_id SET NOT NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.service_orders') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='service_orders' AND column_name='employee_id') THEN
    IF NOT EXISTS (SELECT 1 FROM service_orders WHERE employee_id IS NULL) THEN
      ALTER TABLE service_orders ALTER COLUMN employee_id SET NOT NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.financial_requests') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='financial_requests' AND column_name='employee_id') THEN
    IF NOT EXISTS (SELECT 1 FROM financial_requests WHERE employee_id IS NULL) THEN
      ALTER TABLE financial_requests ALTER COLUMN employee_id SET NOT NULL;
    END IF;
  END IF;
END $$;
