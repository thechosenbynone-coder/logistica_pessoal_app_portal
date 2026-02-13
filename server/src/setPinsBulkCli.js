import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const { Pool } = pg;

const args = process.argv.slice(2);

const getArgValue = (name) => {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return '';
  return args[index + 1] || '';
};

const hasFlag = (name) => args.includes(`--${name}`);

const maskPin = (pin) => {
  if (!pin) return '';
  if (pin.length <= 2) return `${pin[0] || '*'}*`;
  return `${pin.slice(0, 2)}${'*'.repeat(pin.length - 2)}`;
};

const parseIds = (raw) => {
  if (!raw) return [];

  const values = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (!values.length) return [];

  const ids = values.map((value) => Number(value));
  const invalid = ids.some((id) => !Number.isInteger(id) || id <= 0);

  if (invalid) {
    throw new Error('Flag --ids inválida. Use IDs inteiros positivos separados por vírgula, ex: "1,2,3".');
  }

  return [...new Set(ids)];
};

const buildSafeWhereClause = (rawWhere, params) => {
  if (!rawWhere) return '';

  const where = rawWhere.trim();
  const unsupportedChars = /[;]|--|\/\*|\*\//;
  if (unsupportedChars.test(where)) {
    console.warn('Aviso: --where ignorado por conter caracteres não permitidos.');
    return '';
  }

  const pattern = /^([a-z_][a-z0-9_]*)\s*(=|!=|<>|>|<|>=|<=|ILIKE|LIKE)\s*('([^']*)'|\d+)$/i;
  const match = where.match(pattern);

  if (!match) {
    console.warn('Aviso: --where ignorado por não seguir um formato seguro (ex: "status = \'ATIVO\'" ou "id > 10").');
    return '';
  }

  const column = match[1].toLowerCase();
  const operator = match[2].toUpperCase();
  const rawValue = match[3];
  const allowedColumns = new Set(['id', 'status', 'name', 'employee_id', 'registration']);

  if (!allowedColumns.has(column)) {
    console.warn(`Aviso: --where ignorado porque a coluna "${column}" não está na allowlist.`);
    return '';
  }

  let value;
  if (rawValue.startsWith('\'')) {
    value = rawValue.slice(1, -1);
  } else {
    value = Number(rawValue);
    if (!Number.isFinite(value)) {
      console.warn('Aviso: --where ignorado por valor numérico inválido.');
      return '';
    }
  }

  params.push(value);
  const placeholder = `$${params.length}`;

  return ` AND ${column} ${operator} ${placeholder}`;
};

const generatePin = ({ length, digitsOnly, usedPins }) => {
  const digitChars = '0123456789';
  const alnumChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const charset = digitsOnly ? digitChars : alnumChars;

  while (true) {
    let pin = '';
    for (let i = 0; i < length; i += 1) {
      const index = crypto.randomInt(0, charset.length);
      pin += charset[index];
    }

    if (!usedPins.has(pin)) {
      usedPins.add(pin);
      return pin;
    }
  }
};

const writeCsv = async (outputPath, rows) => {
  const header = 'employee_id,pin,updated_at';
  const lines = rows.map((row) => `${row.employee_id},${row.pin},${row.updated_at}`);
  const content = [header, ...lines].join('\n');

  const resolvedPath = path.resolve(outputPath);
  await fs.writeFile(resolvedPath, `${content}\n`, 'utf8');
  return resolvedPath;
};

const run = async () => {
  const lengthRaw = getArgValue('length');
  const output = getArgValue('output') || './pins_export.csv';
  const idsRaw = getArgValue('ids');
  const whereRaw = getArgValue('where');
  const force = hasFlag('force');

  const length = lengthRaw ? Number(lengthRaw) : 4;
  if (!Number.isInteger(length) || length < 4 || length > 12) {
    throw new Error('Flag --length inválida. Use um número inteiro entre 4 e 12.');
  }

  const digitsOnly = !hasFlag('no-digits-only');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não definida. Configure a variável de ambiente antes de executar o script.');
  }

  const ids = parseIds(idsRaw);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    const columnsCheck = await client.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'employees'
         AND column_name IN ('access_pin_hash', 'access_pin_updated_at')`
    );

    const existingColumns = new Set(columnsCheck.rows.map((row) => row.column_name));
    const missingColumns = ['access_pin_hash', 'access_pin_updated_at'].filter((column) => !existingColumns.has(column));

    if (missingColumns.length > 0) {
      throw new Error(
        `Schema incompatível: faltam colunas em employees (${missingColumns.join(', ')}). `
          + 'Rode as migrations antes de executar este comando.'
      );
    }

    await client.query('BEGIN');

    const params = [];
    let sql = 'SELECT id FROM employees WHERE 1=1';

    if (!force) {
      sql += ' AND access_pin_hash IS NULL';
    }

    if (ids.length > 0) {
      params.push(ids);
      sql += ` AND id = ANY($${params.length}::int[])`;
    }

    const safeWhereClause = buildSafeWhereClause(whereRaw, params);
    sql += safeWhereClause;
    sql += ' ORDER BY id';

    const employeesResult = await client.query(sql, params);
    const employeeIds = employeesResult.rows.map((row) => row.id);

    if (employeeIds.length === 0) {
      await client.query('ROLLBACK');
      console.log('Nenhum colaborador elegível encontrado. Nenhuma atualização foi feita.');
      return;
    }

    const usedPins = new Set();
    const updatedAt = new Date().toISOString();
    const exportRows = [];

    for (const employeeId of employeeIds) {
      const pin = generatePin({ length, digitsOnly, usedPins });
      const hash = await bcrypt.hash(pin, 10);

      await client.query(
        `UPDATE employees
         SET access_pin_hash = $1,
             access_pin_updated_at = NOW()
         WHERE id = $2`,
        [hash, employeeId]
      );

      exportRows.push({
        employee_id: employeeId,
        pin,
        updated_at: updatedAt,
      });
    }

    await client.query('COMMIT');

    const filePath = await writeCsv(output, exportRows);
    const maskedSamples = exportRows.slice(0, 3).map((row) => `${row.employee_id}:${maskPin(row.pin)}`);

    console.log(`PINs atualizados para ${exportRows.length} colaborador(es).`);
    console.log(`Arquivo de exportação: ${filePath}`);
    if (maskedSamples.length > 0) {
      console.log(`Amostras mascaradas: ${maskedSamples.join(', ')}`);
    }
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // no-op
    }

    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((error) => {
  console.error(`Erro ao gerar PINs em lote: ${error.message}`);
  process.exit(1);
});

/*
Exemplos de uso:
cd server
npm install
DATABASE_URL="..." npm run set-pins-bulk -- --length 4 --output ./pins_export.csv
DATABASE_URL="..." npm run set-pins-bulk -- --ids "1,2,3" --output ./pins_1_2_3.csv
DATABASE_URL="..." npm run set-pins-bulk -- --force --length 6 --output ./pins_force.csv
*/
