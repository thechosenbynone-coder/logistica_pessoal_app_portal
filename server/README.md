# Employee Logistics Server (API)

## Local (desenvolvimento)

1. Copie o arquivo de exemplo e configure seu Postgres:

```bash
cd server
cp .env.example .env
```

2. Instale dependências:

```bash
npm i
```

3. Rode migrações e gere o client:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

4. Popular dados demo:

```bash
npm run seed
```

5. Subir API:

```bash
npm run dev
```

A API sobe em `http://localhost:3000` por padrão (ou valor de `PORT`).

## Endpoints (principais)

- `GET /api/health`
- `GET /health` (alias)
- `GET /api/epi/catalog`
- `POST /api/epi/catalog`
- `GET /api/epi/deliveries`
- `POST /api/epi/deliveries`
- `GET /api/employees/:id/epi-deliveries`

> Autenticação ainda não foi implementada. Para demo, passe `?userId=` ou header `x-user-id`.

## SQL mínimo para módulo de EPI

O servidor tenta criar/atualizar automaticamente a tabela `epi_catalog` no boot.
Use o SQL abaixo apenas como fallback manual:

```sql
CREATE TABLE IF NOT EXISTS epi_catalog (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  ca TEXT,
  unit TEXT,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS epi_deliveries (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  epi_item_id INTEGER NOT NULL,
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity INTEGER NOT NULL DEFAULT 1,
  signature_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```
