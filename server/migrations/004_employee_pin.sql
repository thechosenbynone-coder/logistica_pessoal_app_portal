DO $$ BEGIN
  ALTER TABLE employees ADD COLUMN IF NOT EXISTS access_pin_hash TEXT;
EXCEPTION WHEN undefined_table THEN END $$;

DO $$ BEGIN
  ALTER TABLE employees ADD COLUMN IF NOT EXISTS access_pin_updated_at TIMESTAMPTZ;
EXCEPTION WHEN undefined_table THEN END $$;
