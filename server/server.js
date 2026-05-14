import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import { authOptional } from './src/auth.js';
import { registerIntegrationRoutes } from './src/integrationRoutes.js';
import { prisma } from './src/prismaClient.js';
import { employeeBodyAuth, handleServerError } from './src/helpers.js';
import authRouter from './src/routes/auth.routes.js';
import employeesRouter from './src/routes/employees.routes.js';
import vesselsRouter from './src/routes/vessels.routes.js';
import documentsRouter from './src/routes/documents.routes.js';
import deploymentsRouter from './src/routes/deployments.routes.js';
import epiRouter from './src/routes/epi.routes.js';
import dailyReportsRouter from './src/routes/dailyReports.routes.js';
import serviceOrdersRouter from './src/routes/serviceOrders.routes.js';
import financialRequestsRouter from './src/routes/financialRequests.routes.js';
import dashboardRouter from './src/routes/dashboard.routes.js';
import portalAuthRouter from './src/routes/portal-auth.routes.js';
import toolsRouter from './src/routes/tools.routes.js';
import accommodationsRouter from './src/routes/accommodations.routes.js';
import checkinRouter from './src/routes/checkin.routes.js';
import transferLegsRouter from './src/routes/transferLegs.routes.js';
import { registerModuleRoutes } from './src/modules/index.js';
import { sanitizeInput } from './src/middlewares/sanitize.middleware.js';
import { auditTrail } from './src/middlewares/audit.middleware.js';
import { structuredRequestLog } from './src/middlewares/logging.middleware.js';
import { globalErrorHandler, notFoundHandler } from './src/middlewares/error.middleware.js';
import { helmetLike, rateLimitLike } from './src/middlewares/security.middleware.js';

const app = express();
const port = process.env.PORT || 3001;

const normalizeOrigin = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/\/+$/, '').toLowerCase();
};

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

let didLogPermissiveCorsWarning = false;

const corsOptions = {
  origin: (origin, callback) => {
    if (origin === undefined || origin === null) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);

    if (allowedOrigins.length === 0) {
      if (!didLogPermissiveCorsWarning) {
        console.warn('[CORS] CORS_ORIGINS não configurado. Rodando em modo permissivo temporário.');
        didLogPermissiveCorsWarning = true;
      }
      return callback(null, true);
    }

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    console.warn(
      `[CORS] blocked origin=${origin} normalized=${normalizedOrigin} allowed=${allowedOrigins.join(',')}`
    );
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));

app.use(helmetLike);
app.use(rateLimitLike({ windowMs: 15 * 60 * 1000, max: Number(process.env.RATE_LIMIT_MAX || 500) }));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(sanitizeInput);
app.use(cookieParser());
app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res
      .status(400)
      .json({ code: 'INVALID_JSON', message: 'JSON inválido no corpo da requisição.' });
  }
  return next(error);
});
app.use(authOptional);
app.use(auditTrail);
app.use(structuredRequestLog);
registerIntegrationRoutes(app);

app.get(['/api/health', '/health'], async (_req, res) => {
  try {
    await prisma.$connect();
    await prisma.employee.findFirst({ select: { id: true } });
    res.json({ ok: true, status: 'ok', database: 'connected' });
  } catch (error) {
    handleServerError(res, error, 'health-check');
  }
});

app.use(portalAuthRouter);
app.use(vesselsRouter);
app.use(dailyReportsRouter);
app.use(dashboardRouter);
app.use(toolsRouter);
app.use(accommodationsRouter);
app.use(checkinRouter);
app.use(transferLegsRouter);
registerModuleRoutes(app);

app.get('/api/checkins', (_req, res) => res.json([]));
app.post('/api/checkins', ...employeeBodyAuth, (_req, res) => res.status(201).json({ ok: true }));

app.get('/', (_req, res) => res.send('API Logística Offshore - Online 🚀'));

app.use(notFoundHandler);
app.use(globalErrorHandler);

const bootstrap = async () => {
  await prisma.$connect();
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 API rodando em http://localhost:${port}`);
  });
};

bootstrap().catch((error) => {
  console.error('[BOOT] erro fatal ao iniciar API:', error?.stack || error);
  process.exit(1);
});
