# Logística de Pessoal (Monorepo)

Sistema de logística de pessoal para gestão de colaboradores, embarques, ordens de serviço e equipamentos.

## Estrutura do Projeto

```
logistica_pessoal_preparado/
├── apps/
│   ├── colaborador/          # App do Colaborador (Vite + React + Tailwind)
│   │   └── src/
│   │       ├── components/   # Componentes UI reutilizáveis
│   │       ├── features/     # Módulos de domínio
│   │       │   ├── home/     # Tela inicial e check-in
│   │       │   ├── trip/     # QR code e cartão de embarque
│   │       │   ├── work/     # OS, RDO, Timesheet
│   │       │   ├── finance/  # Despesas e adiantamentos
│   │       │   ├── profile/  # Perfil e documentos
│   │       │   ├── equipment/# Equipamentos e EPI
│   │       │   └── history/  # Histórico de embarques
│   │       ├── hooks/        # Hooks reutilizáveis
│   │       ├── utils/        # Utilitários (datas, moeda, etc.)
│   │       └── data/         # Dados mock
│   │
│   └── portal-rh/            # Portal do RH (Vite + React + Tailwind)
│       └── src/
│           ├── components/   # Componentes globais
│           ├── features/     # Módulos (dashboard, employees, etc.)
│           ├── layout/       # Sidebar e Topbar
│           ├── ui/           # Componentes de UI base
│           └── state/        # Gerenciamento de estado
│
├── server/                   # API (Express + Prisma)
│   ├── src/
│   └── prisma/
│
├── .eslintrc.cjs             # Configuração ESLint
├── .prettierrc               # Configuração Prettier
├── vitest.config.js          # Configuração Vitest
└── package.json              # Root package (workspaces)
```

## Instalação

```bash
# Instalar dependências (na raiz)
npm install
```

## Rodando em Desenvolvimento

```bash
# Rodar tudo (colaborador + portal + API)
npm run dev:all

# Ou individualmente:
npm run dev:colaborador   # http://localhost:5173
npm run dev:portal        # http://localhost:5174
npm run dev:api           # http://localhost:3001
```

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev:all` | Roda todos os serviços |
| `npm run dev:colaborador` | Roda app do colaborador |
| `npm run dev:portal` | Roda portal RH |
| `npm run dev:api` | Roda API |
| `npm run build` | Build de produção (ambos apps) |
| `npm run lint` | Executa ESLint |
| `npm run lint:fix` | Corrige problemas de lint |
| `npm run format` | Formata código com Prettier |
| `npm run test` | Executa testes com Vitest |
| `npm run test:watch` | Testes em modo watch |

## Arquitetura

### App Colaborador
- **Estrutura modular**: Features isoladas por domínio
- **Componentes reutilizáveis**: ErrorBoundary, LoadingSpinner, SignaturePad
- **Hooks customizados**: useLocalStorageState, useGeolocation
- **Tratamento de erros**: Error Boundary global

### Portal RH
- **Layout**: Sidebar + Topbar responsivos
- **Features**: Dashboard, Colaboradores, Equipamentos, Documentos, Financeiro
- **Estado**: localStorage para persistência

### API (Server)
- **Express**: REST API
- **Prisma**: ORM para banco de dados
- **Endpoints**: /api/profile, /api/checkins, /api/expenses, etc.

## Refatoração Aplicada

1. **God Component eliminado**: EmployeeLogisticsApp.jsx reduzido de 2935 para ~180 linhas
2. **Separação por features**: Cada domínio em sua própria pasta
3. **Componentes reutilizáveis**: ErrorBoundary, LoadingSpinner, EmptyState
4. **Utilitários centralizados**: Formatação de datas, moeda, CPF
5. **ESLint + Prettier**: Padronização de código
6. **Vitest**: Testes unitários para utilitários

## Convenções

- **Nomes de arquivos**: PascalCase para componentes, camelCase para hooks/utils
- **Exportações**: Barrel exports (index.js) por feature
- **Estilização**: Tailwind CSS
- **Formato de datas**: DD/MM/YYYY (exibição), YYYY-MM-DD (armazenamento)

## Próximos Passos Recomendados

1. Integrar API real (remover mocks)
2. Adicionar autenticação JWT
3. Implementar React Query para cache de dados
4. Expandir cobertura de testes
5. Adicionar TypeScript gradualmente


## Deploy (Render) - SPA Rewrite

Para o Portal RH (SPA com router via `history.pushState`), acessos diretos como `/dashboard` ou `/documentacoes?status=expired` podem retornar 404 no Render se não houver regra de rewrite.

Configure no serviço **Static Site** do Render:

- **Source**: `/*`
- **Destination**: `/index.html`
- **Action**: `Rewrite`

Assim, o servidor entrega sempre o `index.html` e o router do frontend resolve a rota correta no browser.
