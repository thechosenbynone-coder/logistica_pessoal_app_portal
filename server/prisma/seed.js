import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/prismaClient.js';
import { recomputeAllEmployeeDocStatuses } from '../src/services/employeeDocStatus.js';

const SEED_BCRYPT_ROUNDS = Number(process.env.SEED_BCRYPT_ROUNDS || 4);

const roles = [
  'Técnico de Segurança',
  'Supervisor de Convés',
  'Operador de Produção',
  'Soldador Escalador',
  'Eletricista Offshore',
  'Mecânico de Manutenção',
  'Encarregado de Movimentação de Carga',
  'Almoxarife Offshore',
  'Inspetor de Integridade',
  'Radioperador',
];
const firstNames = ['João', 'Carlos', 'Rafael', 'Marcos', 'Paulo', 'Diego', 'Felipe', 'André', 'Thiago', 'Bruno', 'Lucas'];
const lastNames = ['Silva', 'Souza', 'Santos', 'Pereira', 'Oliveira', 'Costa', 'Mendes', 'Barbosa', 'Almeida'];
const bases = ['Base Macaé', 'Base Rio das Ostras'];

const vesselsSeed = [
  { name: 'P-70', type: 'FPSO', client: 'Petrobras' },
  { name: 'P-74', type: 'FPSO', client: 'Petrobras' },
  { name: 'P-75', type: 'FPSO', client: 'Petrobras' },
  { name: 'P-77', type: 'FPSO', client: 'Petrobras' },
  { name: 'MV Atlântico Norte', type: 'PSV', client: 'DOF' },
  { name: 'PSV Vitória', type: 'PSV', client: 'Bram Offshore' },
  { name: 'AHTS Guará', type: 'AHTS', client: 'CBO' },
  { name: 'OSRV Campos', type: 'OSRV', client: 'OceanPact' },
  { name: 'Base Macaé', type: 'Base', client: 'Interno' },
  { name: 'Base Rio das Ostras', type: 'Base', client: 'Interno' },
];

const epiCatalogSeed = [
  ['Capacete Classe B', 'EPI-001', 180, 40],
  ['Óculos de Segurança Incolor', 'EPI-002', 55, 45],
  ['Luva Vaqueta', 'EPI-003', 210, 60],
  ['Luvas Nitrílicas', 'EPI-004', 30, 35],
  ['Botina de Segurança', 'EPI-005', 72, 30],
  ['Protetor Auricular Plug', 'EPI-006', 120, 80],
  ['Protetor Auricular Concha', 'EPI-007', 24, 22],
  ['Macacão Antichama', 'EPI-008', 50, 20],
  ['Cinto de Segurança Paraquedista', 'EPI-009', 15, 18],
  ['Talabarte Duplo', 'EPI-010', 18, 18],
  ['Trava-quedas', 'EPI-011', 8, 10],
  ['Máscara PFF2', 'EPI-012', 400, 120],
  ['Respirador Facial Inteiro', 'EPI-013', 14, 12],
  ['Cartucho para Respirador', 'EPI-014', 26, 30],
  ['Colete Salva-vidas', 'EPI-015', 65, 25],
  ['Capa de Chuva PVC', 'EPI-016', 22, 20],
  ['Lanterna Intrinsecamente Segura', 'EPI-017', 9, 8],
  ['Detector Multigás Portátil', 'EPI-018', 6, 7],
  ['Capuz Balaclava Antichama', 'EPI-019', 28, 25],
  ['Avental Raspa', 'EPI-020', 12, 15],
];

const addDays = (d) => {
  const x = new Date();
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() + d);
  return x;
};

const createRng = (seed = 123456789) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const rng = createRng(20250321);
const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const cpfDigit = (digits, startWeight) => {
  const total = digits.reduce((acc, n, i) => acc + n * (startWeight - i), 0);
  const rem = total % 11;
  return rem < 2 ? 0 : 11 - rem;
};

const generateCpf = (used) => {
  while (true) {
    const base = Array.from({ length: 9 }, () => randInt(0, 9));
    const d1 = cpfDigit(base, 10);
    const d2 = cpfDigit([...base, d1], 11);
    const cpf = `${base.join('')}${d1}${d2}`;
    if (!used.has(cpf)) {
      used.add(cpf);
      return cpf;
    }
  }
};

const makeDeploymentByType = ({ employeeId, vesselId, kind, startOffset, endOffset, endActualOffset }) => {
  const startDate = addDays(startOffset);
  const endDateExpected = addDays(endOffset);
  return {
    employeeId,
    vesselId,
    startDate,
    endDateExpected,
    endDateActual: endActualOffset == null ? null : addDays(endActualOffset),
    notes: kind,
  };
};

export const runSeed = async () => {
  const used = new Set();
  const employeesData = [];

  for (let i = 0; i < 100; i += 1) {
    const cpf = generateCpf(used);
    employeesData.push({
      name: `${pick(firstNames)} ${pick(lastNames)} ${pick(lastNames)}`,
      cpf,
      role: i === 0 ? 'Diretora de RH' : pick(roles),
      email: `demo${i + 1}@portal.local`,
      phone: `552197${String(1000000 + i).padStart(7, '0')}`,
      base: bases[i % bases.length],
      accessPinHash: await bcrypt.hash(cpf.slice(0, 4), SEED_BCRYPT_ROUNDS),
      accessPinUpdatedAt: new Date(),
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.employeeDocStatus.deleteMany();
    await tx.dailyReport.deleteMany();
    await tx.serviceOrder.deleteMany();
    await tx.epiDelivery.deleteMany();
    await tx.financialRequest.deleteMany();
    await tx.deployment.deleteMany();
    await tx.document.deleteMany();
    await tx.epiCatalog.deleteMany();
    await tx.documentType.deleteMany();
    await tx.vessel.deleteMany();
    await tx.employee.deleteMany();

    await tx.vessel.createMany({ data: vesselsSeed });

    await tx.documentType.createMany({
      data: [
        { code: 'ASO', name: 'ASO', category: 'Médico', requiresExpiration: true },
        { code: 'CBSP', name: 'CBSP', category: 'Treinamento', requiresExpiration: true },
        { code: 'NR-35', name: 'NR-35', category: 'NR', requiresExpiration: true },
      ],
    });

    await tx.epiCatalog.createMany({
      data: epiCatalogSeed.map(([name, code, stockQty, minStock], index) => ({
        name,
        code,
        ca: `CA-${12000 + index}`,
        unit: 'UN',
        stockQty,
        minStock,
        active: true,
      })),
    });

    await tx.employee.createMany({ data: employeesData });

    const [employees, vessels, docTypes, epiItems] = await Promise.all([
      tx.employee.findMany({ orderBy: { id: 'asc' } }),
      tx.vessel.findMany({ orderBy: { id: 'asc' } }),
      tx.documentType.findMany(),
      tx.epiCatalog.findMany({ orderBy: { id: 'asc' } }),
    ]);

    const vesselIds = vessels.map((v) => v.id);
    const dtByCode = Object.fromEntries(docTypes.map((d) => [d.code, d]));
    const nonScenarioEmployees = employees.slice(3);

    const shuffledEmployees = shuffle(nonScenarioEmployees);
    const categoryIds = {
      vencido: [employees[0].id, ...shuffledEmployees.slice(0, 9).map((e) => e.id)],
      exp15: shuffledEmployees.slice(9, 24).map((e) => e.id),
      exp30: shuffledEmployees.slice(24, 39).map((e) => e.id),
      vence: [employees[1].id, ...shuffledEmployees.slice(39, 48).map((e) => e.id)],
      risco: [employees[2].id, ...shuffledEmployees.slice(48, 57).map((e) => e.id)],
    };
    const assigned = new Set([
      ...categoryIds.vencido,
      ...categoryIds.exp15,
      ...categoryIds.exp30,
      ...categoryIds.vence,
      ...categoryIds.risco,
    ]);
    categoryIds.ok = employees.filter((e) => !assigned.has(e.id)).map((e) => e.id);

    const deployments = [];
    const deploymentTargets = {
      ATIVO: 25,
      INICIANDO: 10,
      PROGRAMADO: 20,
      DISTANTE: 10,
      CONCLUIDO: 15,
    };
    const deploymentCounts = {
      ATIVO: 0,
      INICIANDO: 0,
      PROGRAMADO: 0,
      DISTANTE: 0,
      CONCLUIDO: 0,
    };

    const venceWindows = new Map();
    for (const employeeId of categoryIds.vence) {
      const kind = deploymentCounts.ATIVO < 5 ? 'ATIVO' : 'PROGRAMADO';
      const startOffset = kind === 'ATIVO' ? randInt(-8, -1) : randInt(3, 20);
      const duration = randInt(10, 18);
      const endOffset = startOffset + duration;
      const deployment = makeDeploymentByType({
        employeeId,
        vesselId: pick(vesselIds),
        kind,
        startOffset,
        endOffset,
      });
      deployments.push(deployment);
      deploymentCounts[kind] += 1;
      venceWindows.set(employeeId, {
        startOffset,
        endOffset,
      });
    }

    const riscoStarts = new Map();
    for (const employeeId of categoryIds.risco) {
      const startOffset = randInt(8, 30);
      const deployment = makeDeploymentByType({
        employeeId,
        vesselId: pick(vesselIds),
        kind: 'PROGRAMADO',
        startOffset,
        endOffset: startOffset + 14,
      });
      deployments.push(deployment);
      deploymentCounts.PROGRAMADO += 1;
      riscoStarts.set(employeeId, startOffset);
    }

    const allEmployeeIds = employees.map((e) => e.id);
    const protectedEmployeeIds = new Set([employees[0].id, ...categoryIds.vence, ...categoryIds.risco]);
    const genericEmployeeIds = allEmployeeIds.filter((employeeId) => !protectedEmployeeIds.has(employeeId));
    const pushRandomDeployment = (kind) => {
      if (kind === 'ATIVO') {
        const startOffset = randInt(-12, -1);
        deployments.push(
          makeDeploymentByType({
            employeeId: pick(genericEmployeeIds),
            vesselId: pick(vesselIds),
            kind,
            startOffset,
            endOffset: startOffset + randInt(5, 20),
          })
        );
      }
      if (kind === 'INICIANDO') {
        const startOffset = pick([0, 1]);
        deployments.push(
          makeDeploymentByType({
            employeeId: pick(genericEmployeeIds),
            vesselId: pick(vesselIds),
            kind,
            startOffset,
            endOffset: startOffset + pick([14, 21]),
          })
        );
      }
      if (kind === 'PROGRAMADO') {
        const startOffset = randInt(7, 30);
        deployments.push(
          makeDeploymentByType({
            employeeId: pick(genericEmployeeIds),
            vesselId: pick(vesselIds),
            kind,
            startOffset,
            endOffset: startOffset + 14,
          })
        );
      }
      if (kind === 'DISTANTE') {
        const startOffset = randInt(60, 150);
        deployments.push(
          makeDeploymentByType({
            employeeId: pick(genericEmployeeIds),
            vesselId: pick(vesselIds),
            kind,
            startOffset,
            endOffset: startOffset + 14,
          })
        );
      }
      if (kind === 'CONCLUIDO') {
        const startOffset = randInt(-90, -15);
        const endOffset = startOffset + 14;
        deployments.push(
          makeDeploymentByType({
            employeeId: pick(genericEmployeeIds),
            vesselId: pick(vesselIds),
            kind,
            startOffset,
            endOffset,
            endActualOffset: endOffset + pick([0, 1]),
          })
        );
      }
      deploymentCounts[kind] += 1;
    };

    for (const kind of Object.keys(deploymentTargets)) {
      while (deploymentCounts[kind] < deploymentTargets[kind]) {
        pushRandomDeployment(kind);
      }
    }

    await tx.deployment.createMany({ data: deployments });

    const docs = [];
    for (const employee of employees) {
      const baseIssueDate = addDays(-randInt(360, 500));
      docs.push({
        employeeId: employee.id,
        documentTypeId: dtByCode.ASO.id,
        issueDate: baseIssueDate,
        expirationDate: addDays(180),
        verified: true,
        verifiedBy: 'RH Demo',
        verifiedAt: new Date(),
      });
      docs.push({
        employeeId: employee.id,
        documentTypeId: dtByCode.CBSP.id,
        issueDate: addDays(-randInt(220, 420)),
        expirationDate: addDays(220),
        verified: true,
        verifiedBy: 'RH Demo',
        verifiedAt: new Date(),
      });
      docs.push({
        employeeId: employee.id,
        documentTypeId: dtByCode['NR-35'].id,
        issueDate: addDays(-randInt(220, 420)),
        expirationDate: addDays(250),
        verified: true,
        verifiedBy: 'RH Demo',
        verifiedAt: new Date(),
      });
    }

    const setExpiration = (employeeId, docTypeId, expirationDate) => {
      const row = docs.find((d) => d.employeeId === employeeId && d.documentTypeId === docTypeId);
      if (row) row.expirationDate = expirationDate;
    };

    for (const employeeId of categoryIds.vencido) {
      setExpiration(employeeId, dtByCode.ASO.id, addDays(-randInt(2, 25)));
    }
    for (const employeeId of categoryIds.exp15) {
      setExpiration(employeeId, dtByCode.CBSP.id, addDays(randInt(1, 15)));
    }
    for (const employeeId of categoryIds.exp30) {
      setExpiration(employeeId, dtByCode['NR-35'].id, addDays(randInt(16, 30)));
    }
    for (const employeeId of categoryIds.vence) {
      const window = venceWindows.get(employeeId);
      if (window) {
        const minOffset = window.startOffset + 1;
        const maxOffset = Math.max(minOffset, window.endOffset - 1);
        setExpiration(employeeId, dtByCode.CBSP.id, addDays(randInt(minOffset, maxOffset)));
      }
    }
    for (const employeeId of categoryIds.risco) {
      const startOffset = riscoStarts.get(employeeId);
      if (startOffset != null) {
        setExpiration(employeeId, dtByCode['NR-35'].id, addDays(startOffset - 1));
      }
    }

    // Cenários-chave explícitos
    setExpiration(employees[0].id, dtByCode.ASO.id, addDays(-5));
    if (venceWindows.get(employees[1].id)) {
      const scenario2 = venceWindows.get(employees[1].id);
      const scenario2Offset = Math.min(scenario2.endOffset - 1, scenario2.startOffset + 3);
      setExpiration(employees[1].id, dtByCode.CBSP.id, addDays(scenario2Offset));
    }
    if (riscoStarts.get(employees[2].id) != null) {
      const scenario3Offset = riscoStarts.get(employees[2].id) - 1;
      setExpiration(employees[2].id, dtByCode['NR-35'].id, addDays(scenario3Offset));
    }

    await tx.document.createMany({ data: docs, skipDuplicates: true });

    const dailyReports = Array.from({ length: 250 }, (_, idx) => ({
      employeeId: pick(allEmployeeIds),
      reportDate: addDays(-randInt(0, 44)),
      description: `Relatório operacional #${idx + 1}`,
      hoursWorked: Number((8 + randInt(0, 40) / 10).toFixed(2)),
      approvalStatus: idx < 88 ? 'Pendente' : 'Aprovado',
      approvedBy: idx < 88 ? null : pick(['Supervisor Offshore', 'Coordenação Operacional']),
      clientId: `DR-${idx + 1}`,
      clientFilledAt: new Date(),
    }));
    await tx.dailyReport.createMany({ data: shuffle(dailyReports) });

    const serviceOrders = Array.from({ length: 200 }, (_, idx) => ({
      employeeId: pick(allEmployeeIds),
      osNumber: `OS-${String(idx + 1).padStart(4, '0')}`,
      title: `Ordem de serviço ${idx + 1}`,
      description: 'Atividade planejada para manutenção e operação.',
      priority: pick(['BAIXA', 'MEDIA', 'ALTA']),
      openedAt: addDays(-randInt(0, 59)),
      approvalStatus: idx < 50 ? 'Pendente' : 'Aprovado',
      vesselId: pick(vesselIds),
      status: pick(['OPEN', 'IN_PROGRESS', 'CONCLUDED']),
      clientId: `SO-${idx + 1}`,
      clientFilledAt: new Date(),
    }));
    await tx.serviceOrder.createMany({ data: shuffle(serviceOrders) });

    const financialRequests = Array.from({ length: 150 }, (_, idx) => ({
      employeeId: pick(allEmployeeIds),
      type: pick(['Adiantamento', 'Reembolso', 'Ajuda de Custo', 'Diária']),
      amount: Number((150 + randInt(0, 4800) + rng()).toFixed(2)),
      description: `Solicitação financeira ${idx + 1}`,
      status: pick(['Solicitado', 'Pendente', 'Aprovado', 'Pago']),
      clientId: `FR-${idx + 1}`,
      clientFilledAt: addDays(-randInt(0, 59)),
      createdAt: addDays(-randInt(0, 59)),
      updatedAt: new Date(),
    }));
    await tx.financialRequest.createMany({ data: financialRequests });

    const epiDeliveries = Array.from({ length: 200 }, () => ({
      employeeId: pick(allEmployeeIds),
      epiItemId: pick(epiItems).id,
      deliveryDate: addDays(-randInt(0, 59)),
      quantity: randInt(1, 3),
      signatureUrl: rng() < 0.4 ? null : `https://assinaturas.local/${crypto.randomUUID()}.png`,
    }));
    await tx.epiDelivery.createMany({ data: epiDeliveries });
  });

  await recomputeAllEmployeeDocStatuses();

  return {
    ok: true,
    employees: await prisma.employee.count(),
    vessels: await prisma.vessel.count(),
    documentTypes: await prisma.documentType.count(),
    deployments: await prisma.deployment.count(),
    statuses: await prisma.employeeDocStatus.count(),
  };
};

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeed()
    .then((result) => console.log('✅ Seed executado:', result))
    .catch((error) => {
      console.error('❌ Falha no seed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
