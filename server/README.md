# Employee Logistics Server (API)

## Local (desenvolvimento)

1) Copie o arquivo de exemplo e configure seu Postgres:

```bash
cd server
cp .env.example .env
```

2) Instale dependências:

```bash
npm i
```

3) Rode migrações e gere o client:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

4) Popular dados demo:

```bash
npm run seed
```

5) Subir API:

```bash
npm run dev
```

A API sobe em `http://localhost:3001`.

## Endpoints (demo)

- `GET /health`
- `GET /api/me` (usa usuário seed)
- `GET /api/deployments/current?userId=...`
- `GET /api/expenses?userId=...`
- `POST /api/expenses`
- `GET /api/advances?userId=...`
- `POST /api/advances`
- `GET /api/assets?userId=...`
- `PATCH /api/assets/:id/toggle?userId=...`
- `GET /api/checkins?userId=...`
- `POST /api/checkins`

> Autenticação ainda não foi implementada. Para demo, passe `?userId=` ou header `x-user-id`.
