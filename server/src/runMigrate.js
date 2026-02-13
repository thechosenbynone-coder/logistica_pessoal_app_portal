import pg from 'pg';
import 'dotenv/config';
import { migrate } from './migrate.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await migrate(pool);
  console.log('[MIGRATE] concluído');
} finally {
  await pool.end();
}
