import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'migrations');

const ensureMigrationsTable = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations_applied (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

export const migrate = async (pool) => {
  await ensureMigrationsTable(pool);

  const files = (await fs.readdir(MIGRATIONS_DIR))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const applied = await pool.query('SELECT 1 FROM migrations_applied WHERE name = $1 LIMIT 1', [file]);
    if (applied.rowCount > 0) continue;

    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO migrations_applied (name) VALUES ($1)', [file]);
      await pool.query('COMMIT');
      console.log(`[MIGRATE] aplicado: ${file}`);
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  }
};
