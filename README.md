# Employee Logistics (Demo)

Este projeto é uma **demo** do app de Logística Pessoal (embarque/offshore) com:

- **Web (Vite + React + Tailwind)**
- **API (Express + Prisma)** opcional

## 1) Rodar só o Frontend (mais rápido)

✅ **Modo DEMO (sem API e sem banco)**: por padrão o app roda em **mock mode**.

Você não precisa configurar `.env` nem `DATABASE_URL` para ver e editar a UI.

```bash
npm i
npm run dev
```

Acesse `http://localhost:5173`.

## 2) Rodar Frontend + API + Banco (recomendado)

### Requisitos
- Node 18+
- Postgres (local ou cloud)

### Passo a passo

**API**

```bash
cd server
cp .env.example .env
# coloque sua DATABASE_URL
npm i
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

**Web**

Em outro terminal:

```bash
# na raiz do projeto
npm i
npm run dev
```

## Configuração de API no Web

### Mock mode (sem backend)

Se você quer continuar o desenvolvimento só com dados mockados, crie um `.env` na **raiz** (opcional, já vem assim por padrão):

```bash
VITE_MOCK_MODE=true
```

### Modo API (com backend)

- Local: o Vite faz proxy de `/api` para `http://localhost:3001`.
- Produção: configure `VITE_API_BASE_URL` apontando para a URL da sua API e desligue o mock:

Exemplo `.env` (na raiz):

```bash
VITE_MOCK_MODE=false
VITE_API_BASE_URL=https://sua-api.render.com
```

## Deploy (rápido)

- **Web**: Vercel / Netlify / Cloudflare Pages (build: `npm run build`, output: `dist`)
- **API**: Render / Railway / Fly.io (com `server/`)
- **DB**: Neon / Supabase / Railway Postgres

