import express from 'express';
import { prisma } from '../prismaClient.js';
import { startOfTodayDateOnly, recomputeAllEmployeeDocStatuses } from '../services/employeeDocStatus.js';
import { handleServerError } from '../helpers.js';

const router = express.Router();

router.get('/api/dashboard/metrics', async (_req, res) => {
  try {
    const today = startOfTodayDateOnly();
    const [
      employeesTotal,
      activeDeployments,
      dailyReportsPending,
      financialRequestsPending,
      documentsExpired,
      documentsExpiringDuringDeployment,
      documentsExpiringSoon,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.deployment.count({ where: { endDateActual: null } }),
      prisma.dailyReport.count({ where: { approvalStatus: 'Pendente' } }),
      prisma.financialRequest.count({ where: { status: { in: ['Solicitado', 'Aprovado'] } } }),
      prisma.employeeDocStatus.count({ where: { status: 'VENCIDO' } }),
      prisma.employeeDocStatus.count({ where: { status: 'VENCE_NO_EMBARQUE' } }),
      prisma.employeeDocStatus.count({ where: { status: 'VENCENDO' } }),
    ]);

    res.json({
      employeesTotal,
      activeDeployments,
      dailyReportsPending,
      financialRequestsPending,
      documentsExpired,
      documentsExpiringSoon,
      documentsExpiringDuringDeployment,
    });
  } catch (error) {
    handleServerError(res, error, 'dashboard-metrics');
  }
});


// TEMPORÁRIO — remover após rodar uma vez em produção
router.post('/api/admin/recompute-doc-status', async (_req, res) => {
  try {
    await recomputeAllEmployeeDocStatuses();
    res.json({ ok: true });
  } catch (error) {
    handleServerError(res, error, 'recompute-doc-status');
  }
});

export default router;
