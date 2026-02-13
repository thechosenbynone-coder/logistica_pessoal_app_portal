import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'migrations');

// Advisory lock (2 int32) para evitar corrida de migração em múltiplas instâncias
const LOCK_KEY_1 = 2026;
const LOCK_KEY_2 = 213;

const ensureMigrationsTable = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations_applied (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const safeListMigrationFiles = async () => {
  try {
    await fs.access(MIGRATIONS_DIR);
  } catch {
    throw new Error(`Diretório de migrations não encontrado: ${MIGRATIONS_DIR}`);
  }

  const files = (await fs.readdir(MIGRATIONS_DIR))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  return files;
};

export const migrate = async (pool) => {
  // Garante que apenas 1 processo rode migrations por vez
  await pool.query('SELECT pg_advisory_lock($1, $2)', [LOCK_KEY_1, LOCK_KEY_2]);

  try {
    await ensureMigrationsTable(pool);

    const files = await safeListMigrationFiles();

    for (const file of files) {
      const applied = await pool.query(
        'SELECT 1 FROM migrations_applied WHERE name = $1 LIMIT 1',
        [file]
      );
      if (applied.rowCount > 0) {
        console.log(`[MIGRATE] já aplicado, pulando: ${file}`);
        continue;
      }

      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');

      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query('INSERT INTO migrations_applied (name) VALUES ($1)', [file]);
        await pool.query('COMMIT');
        console.log(`[MIGRATE] aplicado: ${file}`);
      } catch (error) {
        await pool.query('ROLLBACK');
        const msg = error?.message || String(error);
        throw new Error(`[MIGRATE] falhou em ${file}: ${msg}`);
      }
    }
  } finally {
    // Libera lock mesmo se der erro
    await pool.query('SELECT pg_advisory_unlock($1, $2)', [LOCK_KEY_1, LOCK_KEY_2]);
  }
};
