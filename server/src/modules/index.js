import authRoutes from './auth/routes/auth.routes.js';
import employeeRoutes from './employee/routes/employee.routes.js';
import documentsRoutes from './documents/routes/documents.routes.js';
import deploymentRoutes from './deployment/routes/deployment.routes.js';
import epiRoutes from './epi/routes/epi.routes.js';
import financeRoutes from './finance/routes/finance.routes.js';
import logisticsRoutes from './logistics/routes/logistics.routes.js';

export function registerModuleRoutes(app) {
  app.use(authRoutes);
  app.use(employeeRoutes);
  app.use(documentsRoutes);
  app.use(deploymentRoutes);
  app.use(epiRoutes);
  app.use(financeRoutes);
  app.use(logisticsRoutes);
}
