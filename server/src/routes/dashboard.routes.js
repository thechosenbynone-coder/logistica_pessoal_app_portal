import express from 'express';
import { prisma } from '../prismaClient.js';
import { startOfTodayDateOnly } from '../services/employeeDocStatus.js';
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
      equipmentLowStockResult,
      deploymentsPlanned,
      deploymentsConfirmed,
      deploymentsEmbarcado,
      deploymentsConcluido,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.deployment.count({ where: { endDateActual: null } }),
      prisma.dailyReport.count({ where: { approvalStatus: 'Pendente' } }),
      prisma.financialRequest.count({ where: { status: { in: ['Solicitado', 'Aprovado'] } } }),
      prisma.employeeDocStatus.count({ where: { status: 'VENCIDO' } }),
      prisma.employeeDocStatus.count({ where: { status: 'VENCE_NO_EMBARQUE' } }),
      prisma.employeeDocStatus.count({ where: { status: 'VENCENDO' } }),
      prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM epi_catalog WHERE active = true AND stock_qty <= min_stock`,
      prisma.deployment.count({ where: { status: 'PLANEJADO' } }),
      prisma.deployment.count({ where: { status: { in: ['CONFIRMADO', 'DOCS_OK'] } } }),
      prisma.deployment.count({ where: { status: 'EMBARCADO' } }),
      prisma.deployment.count({
        where: {
          status: 'CONCLUIDO',
          updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    res.json({
      employeesTotal,
      activeDeployments,
      dailyReportsPending,
      financialRequestsPending,
      documentsExpired,
      documentsExpiringSoon,
      documentsExpiringDuringDeployment,
      equipmentLowStock: Number(equipmentLowStockResult[0]?.count ?? 0),
      deploymentsPlanned,
      deploymentsConfirmed,
      deploymentsEmbarcado,
      deploymentsConcluido,
    });
  } catch (error) {
    handleServerError(res, error, 'dashboard-metrics');
  }
});

router.get('/api/dashboard/pendencias', async (_req, res) => {
  try {
    const today = startOfTodayDateOnly();

    const criticalStatuses = await prisma.employeeDocStatus.findMany({
      where: {
        status: { in: ['VENCIDO', 'VENCE_NO_EMBARQUE', 'VENCENDO'] },
      },
      include: {
        employee: {
          include: {
            deployments: {
              where: {
                status: { in: ['PLANEJADO', 'CONFIRMADO', 'DOCS_OK'] },
                startDate: { gte: today },
              },
              orderBy: { startDate: 'asc' },
              take: 1,
              include: { vessel: true },
            },
          },
        },
      },
      orderBy: { expiresAt: 'asc' },
    });

    const byEmployee = new Map();
    for (const statusRecord of criticalStatuses) {
      const existing = byEmployee.get(statusRecord.employeeId);
      const priority = { VENCIDO: 0, VENCE_NO_EMBARQUE: 1, VENCENDO: 2 };
      if (!existing || priority[statusRecord.status] < priority[existing.status]) {
        byEmployee.set(statusRecord.employeeId, statusRecord);
      }
    }

    const result = Array.from(byEmployee.values()).map((statusRecord) => {
      const nextDeploy = statusRecord.employee.deployments[0];
      const diffMs = new Date(statusRecord.expiresAt) - today;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      return {
        employeeId: statusRecord.employeeId,
        employeeName: statusRecord.employee.name,
        docType: statusRecord.docType,
        status: statusRecord.status,
        expiresAt: statusRecord.expiresAt,
        urgencyDays: Math.abs(diffDays),
        overdue: diffDays < 0,
        nextDeploymentDate: nextDeploy?.startDate ?? null,
        vesselName: nextDeploy?.vessel?.name ?? null,
      };
    });

    result.sort((a, b) => {
      const p = { VENCIDO: 0, VENCE_NO_EMBARQUE: 1, VENCENDO: 2 };
      if (p[a.status] !== p[b.status]) return p[a.status] - p[b.status];
      return a.urgencyDays - b.urgencyDays;
    });

    res.json(result.slice(0, 10));
  } catch (error) {
    handleServerError(res, error, 'dashboard-pendencias');
  }
});

router.get('/api/dashboard/escalas', async (_req, res) => {
  try {
    const cutoff14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const groups = await prisma.deployment.findMany({
      where: {
        OR: [
          {
            status: { in: ['PLANEJADO', 'CONFIRMADO', 'DOCS_OK', 'EMBARCADO'] },
          },
          {
            status: 'CONCLUIDO',
            updatedAt: { gte: cutoff14d },
          },
        ],
      },
      include: {
        employee: { select: { name: true } },
        vessel: { select: { name: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    const statusMap = {
      planejado: ['PLANEJADO', 'CONFIRMADO', 'DOCS_OK'],
      embarcado: ['EMBARCADO'],
      desembarque: ['CONCLUIDO'],
      folga: [],
    };

    const shortName = (name = '') => {
      const parts = name.trim().split(' ');
      if (parts.length === 1) return parts[0];
      return `${parts[0][0]}. ${parts[parts.length - 1]}`;
    };

    const buildGroup = (statuses) => {
      const items = groups.filter((deployment) => statuses.includes(deployment.status));
      return {
        count: items.length,
        names: items.slice(0, 2).map((deployment) => shortName(deployment.employee?.name)),
        hasMore: items.length > 2,
      };
    };

    res.json({
      planejado: buildGroup(statusMap.planejado),
      embarcado: buildGroup(statusMap.embarcado),
      desembarque: buildGroup(statusMap.desembarque),
      folga: { count: 0, names: [], hasMore: false },
      totalOffshore: groups.filter((deployment) => deployment.status === 'EMBARCADO').length,
    });
  } catch (error) {
    handleServerError(res, error, 'dashboard-escalas');
  }
});

router.get('/api/dashboard/vessels-summary', async (_req, res) => {
  try {
    const vessels = await prisma.vessel.findMany({
      include: {
        deployments: {
          where: {
            status: 'EMBARCADO',
            endDateActual: null,
          },
          select: { id: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    const result = vessels
      .map((vessel) => ({
        id: vessel.id,
        name: vessel.name,
        type: vessel.type,
        abordo: vessel.deployments.length,
        status: vessel.deployments.length > 0 ? 'green' : 'muted',
      }))
      .filter((vessel) => vessel.abordo > 0)
      .sort((a, b) => b.abordo - a.abordo);

    res.json(result);
  } catch (error) {
    handleServerError(res, error, 'dashboard-vessels-summary');
  }
});


router.get('/api/dashboard/vessels-upcoming', async (_req, res) => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 30);

    const deployments = await prisma.deployment.findMany({
      where: {
        status: 'PLANEJADO',
        startDate: { lte: cutoff },
      },
      include: {
        vessel: { select: { name: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    const byVessel = {};
    for (const d of deployments) {
      const vName = d.vessel?.name || 'Desconhecida';
      if (!byVessel[vName]) {
        byVessel[vName] = {
          name: vName,
          embarque: new Date(d.startDate).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
          }),
          count: 0,
          gate: 'green',
        };
      }
      byVessel[vName].count++;
    }

    res.json(Object.values(byVessel));
  } catch (error) {
    handleServerError(res, error, 'dashboard-vessels-upcoming');
  }
});

router.get('/api/dashboard/activity', async (_req, res) => {
  try {
    const limit = 5;

    const [requests, documents, deployments, reports] = await Promise.all([
      prisma.financialRequest.findMany({
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { employee: { select: { name: true } } },
      }),
      prisma.document.findMany({
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          employee: { select: { name: true } },
          documentType: { select: { name: true } },
        },
      }),
      prisma.deployment.findMany({
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          employee: { select: { name: true } },
          vessel: { select: { name: true } },
        },
      }),
      prisma.dailyReport.findMany({
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { employee: { select: { name: true } } },
      }),
    ]);

    const shortName = (name = '') => {
      const parts = name.trim().split(' ');
      if (parts.length === 1) return parts[0];
      return `${parts[0]} ${parts[parts.length - 1][0]}.`;
    };

    const events = [
      ...requests.map((request) => ({
        type: 'financial_request',
        module: 'Solicitações',
        action: 'atualizou solicitação',
        user: shortName(request.employee?.name ?? 'Sistema'),
        detail: { Tipo: request.type, Status: request.status },
        updatedAt: request.updatedAt,
      })),
      ...documents.map((document) => ({
        type: 'document',
        module: 'Documentações',
        action: 'atualizou documento',
        user: shortName(document.employee?.name ?? 'Sistema'),
        detail: {
          Documento: document.documentType?.name,
          Colaborador: shortName(document.employee?.name ?? ''),
        },
        updatedAt: document.updatedAt,
      })),
      ...deployments.map((deployment) => ({
        type: 'deployment',
        module: 'Escalas',
        action: 'atualizou embarque',
        user: shortName(deployment.employee?.name ?? 'Sistema'),
        detail: {
          Colaborador: shortName(deployment.employee?.name ?? ''),
          Status: deployment.status,
          Embarcação: deployment.vessel?.name,
        },
        updatedAt: deployment.updatedAt,
      })),
      ...reports.map((report) => ({
        type: 'daily_report',
        module: 'RDOs',
        action: 'atualizou RDO',
        user: shortName(report.employee?.name ?? 'Sistema'),
        detail: {
          Colaborador: shortName(report.employee?.name ?? ''),
          Status: report.approvalStatus,
        },
        updatedAt: report.updatedAt,
      })),
    ];

    events.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    const relativeTime = (date) => {
      const diffMs = Date.now() - new Date(date).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'agora';
      if (mins < 60) return `${mins}min`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h`;
      return `${Math.floor(hrs / 24)}d`;
    };

    res.json(
      events.slice(0, 10).map((event) => {
        const { updatedAt, ...rest } = event;
        return { ...rest, time: relativeTime(updatedAt) };
      }),
    );
  } catch (error) {
    handleServerError(res, error, 'dashboard-activity');
  }
});

export default router;
