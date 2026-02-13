import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const { Pool } = pg;

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return '';
  return args[idx + 1] || '';
};

const idRaw = getArg('id');
const pin = getArg('pin');
const employeeId = Number(idRaw);

if (!Number.isInteger(employeeId) || employeeId <= 0) {
  console.error('Uso: node src/setPinCli.js --id <employee_id> --pin <pin>');
  process.exit(1);
}

if (!pin || pin.length < 4 || pin.length > 12) {
  console.error('PIN inválido: use 4 a 12 caracteres.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  const hash = await bcrypt.hash(pin, 10);
  const result = await pool.query(
    `UPDATE employees
     SET access_pin_hash = $1,
         access_pin_updated_at = NOW()
     WHERE id = $2
     RETURNING id`,
    [hash, employeeId]
  );

  if (!result.rows[0]) {
    console.error('Colaborador não encontrado.');
    process.exit(1);
  }

  console.log('PIN atualizado com sucesso.');
} finally {
  await pool.end();
}
