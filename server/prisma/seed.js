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

const addDays = (d) => {
  const x = new Date();
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() + d);
  return x;
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const cpfDigit = (digits, startWeight) => {
  const total = digits.reduce((acc, n, i) => acc + n * (startWeight - i), 0);
  const rem = total % 11;
  return rem < 2 ? 0 : 11 - rem;
};
const generateCpf = (used) => {
  while (true) {
    const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
    const d1 = cpfDigit(base, 10);
    const d2 = cpfDigit([...base, d1], 11);
    const cpf = `${base.join('')}${d1}${d2}`;
    if (!used.has(cpf)) {
      used.add(cpf);
      return cpf;
    }
  }
};

export const runSeed = async () => {
  const used = new Set();
  const employeesData = [];

  for (let i = 0; i < 65; i += 1) {
    const cpf = generateCpf(used);
    employeesData.push({
      name: `${pick(firstNames)} ${pick(lastNames)} ${pick(lastNames)}`,
      cpf,
      role: i === 0 ? 'Diretora de RH' : pick(roles),
      email: `demo${i + 1}@portal.local`,
      phone: `552197${String(1000000 + i).padStart(7, '0')}`,
      base: 'Base Macaé',
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

    await tx.vessel.createMany({
      data: [
        { name: 'P-70', type: 'FPSO', client: 'Petrobras' },
        { name: 'P-75', type: 'FPSO', client: 'Petrobras' },
        { name: 'Base Macaé', type: 'Base', client: 'Interno' },
      ],
    });

    await tx.documentType.createMany({
      data: [
        { code: 'ASO', name: 'ASO', category: 'Médico', requiresExpiration: true },
        { code: 'CBSP', name: 'CBSP', category: 'Treinamento', requiresExpiration: true },
        { code: 'NR-35', name: 'NR-35', category: 'NR', requiresExpiration: true },
      ],
    });

    await tx.employee.createMany({ data: employeesData });

    const [employees, vessels, docTypes] = await Promise.all([
      tx.employee.findMany({ orderBy: { id: 'asc' } }),
      tx.vessel.findMany({ orderBy: { id: 'asc' } }),
      tx.documentType.findMany(),
    ]);

    const vesselByName = Object.fromEntries(vessels.map((v) => [v.name, v]));
    const dtByCode = Object.fromEntries(docTypes.map((d) => [d.code, d]));

    const scenarioEmployeeIds = new Set([employees[0].id, employees[1].id, employees[2].id]);
    const nonScenarioEmployees = employees.slice(3);

    const batchWindows = [
      { vessel: 'P-70', start: addDays(3), end: addDays(17), size: 10 },
      { vessel: 'P-75', start: addDays(5), end: addDays(19), size: 10 },
      { vessel: 'P-70', start: addDays(20), end: addDays(34), size: 8 },
      { vessel: 'P-75', start: addDays(22), end: addDays(36), size: 8 },
      { vessel: 'Base Macaé', start: addDays(1), end: addDays(8), size: 8 },
    ];

    let idx = 0;
    const deployments = [];
    for (const batch of batchWindows) {
      for (let i = 0; i < batch.size; i += 1) {
        deployments.push({
          employeeId: nonScenarioEmployees[idx % nonScenarioEmployees.length].id,
          vesselId: vesselByName[batch.vessel].id,
          startDate: batch.start,
          endDateExpected: batch.end,
          notes: `Lote ${batch.vessel} ${batch.start.toISOString().slice(0, 10)}`,
        });
        idx += 1;
      }
    }

    for (let i = 0; i < 12; i += 1) {
      deployments.push({
        employeeId: nonScenarioEmployees[(idx + i) % nonScenarioEmployees.length].id,
        vesselId: vesselByName['P-70'].id,
        startDate: addDays(-10 - i),
        endDateExpected: addDays(4 + i),
        notes: 'Embarque em andamento',
      });
    }

    await tx.deployment.createMany({ data: deployments });

    const docs = [];
    for (const employee of employees) {
      docs.push({
        employeeId: employee.id,
        documentTypeId: dtByCode.ASO.id,
        issueDate: addDays(-320),
        expirationDate: addDays(120),
        verified: true,
        verifiedBy: 'RH Demo',
        verifiedAt: new Date(),
      });
      docs.push({
        employeeId: employee.id,
        documentTypeId: dtByCode.CBSP.id,
        issueDate: addDays(-240),
        expirationDate: addDays(160),
        verified: true,
        verifiedBy: 'RH Demo',
        verifiedAt: new Date(),
      });
      docs.push({
        employeeId: employee.id,
        documentTypeId: dtByCode['NR-35'].id,
        issueDate: addDays(-210),
        expirationDate: addDays(200),
        verified: true,
        verifiedBy: 'RH Demo',
        verifiedAt: new Date(),
      });
    }

    // Cenário 1: employee[0] com ASO vencido
    docs.find(
      (d) => d.employeeId === employees[0].id && d.documentTypeId === dtByCode.ASO.id
    ).expirationDate = addDays(-5);

    // Cenário 2: employee[1] com deployment de 14 dias e CBSP vencendo dentro da janela
    const scenario2Employee = employees[1];
    await tx.deployment.create({
      data: {
        employeeId: scenario2Employee.id,
        vesselId: vesselByName['P-75'].id,
        startDate: addDays(2),
        endDateExpected: addDays(16),
        notes: 'Cenário VENCE_NO_EMBARQUE',
      },
    });
    docs.find(
      (d) => d.employeeId === scenario2Employee.id && d.documentTypeId === dtByCode.CBSP.id
    ).expirationDate = addDays(9);

    // Cenário 3: employee[2] com próximo deployment e NR-35 vencendo 1 dia antes
    const scenario3Employee = employees[2];
    await tx.deployment.create({
      data: {
        employeeId: scenario3Employee.id,
        vesselId: vesselByName['P-70'].id,
        startDate: addDays(12),
        endDateExpected: addDays(26),
        notes: 'Cenário RISCO_REEMBARQUE',
      },
    });
    docs.find(
      (d) => d.employeeId === scenario3Employee.id && d.documentTypeId === dtByCode['NR-35'].id
    ).expirationDate = addDays(11);

    await tx.document.createMany({ data: docs, skipDuplicates: true });

    // sanity: garantir que cenários não receberam lotes genéricos
    const overlapCount = await tx.deployment.count({
      where: {
        employeeId: { in: Array.from(scenarioEmployeeIds) },
        notes: { startsWith: 'Lote ' },
      },
    });
    if (overlapCount > 0) {
      throw new Error('Seed inválido: cenários receberam deployments de lote geral.');
    }
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
