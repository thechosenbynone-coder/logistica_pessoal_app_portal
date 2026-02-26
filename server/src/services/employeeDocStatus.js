import crypto from 'crypto';
import { prisma } from '../prismaClient.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const toDateOnly = (value) => {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const startOfTodayDateOnly = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return toDateOnly(new Date());
  }

  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
};

export const computeEmployeeDocStatus = async (employeeId) => {
  const today = startOfTodayDateOnly();

  const [documents, deployments] = await Promise.all([
    prisma.document.findMany({
      where: { employeeId },
      include: { documentType: { select: { code: true, name: true } } },
    }),
    prisma.deployment.findMany({
      where: { employeeId },
      orderBy: { startDate: 'asc' },
    }),
  ]);

  const normalizedDeployments = deployments
    .map((dep) => {
      if (!dep.startDate) return null;
      const end = dep.endDateActual || dep.endDateExpected;
      if (!end) return null;
      return {
        embarkDateOnly: toDateOnly(dep.startDate),
        disembarkDateOnly: toDateOnly(end),
      };
    })
    .filter(Boolean);

  const currentOrFutureDeployments = normalizedDeployments.filter(
    (dep) => dep.disembarkDateOnly >= today
  );

  const currentDeployments = currentOrFutureDeployments.filter(
    (dep) => dep.embarkDateOnly <= today && dep.disembarkDateOnly >= today
  );

  const nextDeployment = currentOrFutureDeployments.find((dep) => dep.embarkDateOnly > today);
  const computedAt = new Date();
  const rowsToCreate = [];

  for (const document of documents) {
    const docType =
      document.documentType?.code || document.documentType?.name || `DOC-${document.documentTypeId}`;
    if (!document.expirationDate || !docType) continue;

    const expiresAt = toDateOnly(document.expirationDate);
    let status = 'OK';
    let venceDuranteEmbarque = false;
    let riscoReembarque = false;

    if (expiresAt < today) {
      status = 'VENCIDO';
    } else {
      for (const deployment of currentDeployments) {
        if (expiresAt >= deployment.embarkDateOnly && expiresAt <= deployment.disembarkDateOnly) {
          status = 'VENCE_NO_EMBARQUE';
          venceDuranteEmbarque = true;
          break;
        }
      }

      if (status === 'OK' && nextDeployment?.embarkDateOnly) {
        const nextEmbark = nextDeployment.embarkDateOnly;
        const riskWindowStart = new Date(nextEmbark.getTime() - DAY_MS);
        if (expiresAt >= riskWindowStart && expiresAt < nextEmbark) {
          status = 'RISCO_REEMBARQUE';
          riscoReembarque = true;
        }
      }

      if (status === 'OK') {
        const in30Days = new Date(today.getTime() + 30 * DAY_MS);
        if (expiresAt <= in30Days) {
          status = 'VENCENDO';
        }
      }
    }

    rowsToCreate.push({
      id: crypto.randomUUID(),
      employeeId,
      docType,
      status,
      expiresAt,
      computedAt,
      venceDuranteEmbarque,
      riscoReembarque,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.employeeDocStatus.deleteMany({ where: { employeeId } });
    if (rowsToCreate.length) {
      await tx.employeeDocStatus.createMany({ data: rowsToCreate });
    }
  });
};

export const recomputeAllEmployeeDocStatuses = async () => {
  const employees = await prisma.employee.findMany({ select: { id: true } });
  for (const employee of employees) {
    await computeEmployeeDocStatus(employee.id);
  }
};

export { startOfTodayDateOnly, toDateOnly };
